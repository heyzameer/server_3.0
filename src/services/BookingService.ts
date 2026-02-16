import { injectable, inject } from 'tsyringe';
import { IBooking } from '../interfaces/IModel/IBooking';
import { IAvailabilityService } from './AvailabilityService';
import { Booking } from '../models/Booking';
import { Room } from '../models/Room';
import { MealPlan } from '../models/MealPlan';
import { Activity } from '../models/Activity';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';

interface RoomBookingInput {
    roomId: string;
    guests: number;
}

interface PriceBreakdown {
    roomPrices: {
        roomId: string;
        roomName: string;
        nights: number;
        pricePerNight: number;
        totalGuests: number;
        subtotal: number;
    }[];
    roomTotal: number;
    mealPlanPrice?: number;
    activityPrices?: {
        activityId: string;
        activityName: string;
        participants: number;
        pricePerPerson: number;
        subtotal: number;
    }[];
    activityTotal?: number;
    subtotal: number;
    taxes: number;
    finalPrice: number;
}

interface CreateBookingDto {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    rooms: RoomBookingInput[];
    mealPlanId?: string;
    activityIds?: string[];
    guestDetails: {
        name: string;
        age: number;
        gender: string;
    }[];
}

export interface IBookingService {
    calculateBookingPrice(input: {
        propertyId: string;
        checkIn: Date;
        checkOut: Date;
        rooms: RoomBookingInput[];
        mealPlanId?: string;
        activityIds?: string[];
    }): Promise<PriceBreakdown>;
    createBooking(userId: string, partnerId: string, bookingDto: CreateBookingDto): Promise<IBooking>;
    approveBooking(bookingId: string, partnerId: string): Promise<IBooking>;
    rejectBooking(bookingId: string, partnerId: string, reason: string): Promise<IBooking>;
    getPartnerBookings(partnerId: string, filters?: { status?: string; approvalStatus?: string }): Promise<IBooking[]>;
    getUserBookings(userId: string): Promise<IBooking[]>;
    getBookingById(bookingId: string): Promise<IBooking>;
}

@injectable()
export class BookingService implements IBookingService {
    constructor(
        @inject('AvailabilityService') private availabilityService: IAvailabilityService
    ) { }

    /**
     * Calculate booking price breakdown
     */
    async calculateBookingPrice(input: {
        propertyId: string;
        checkIn: Date;
        checkOut: Date;
        rooms: RoomBookingInput[];
        mealPlanId?: string;
        activityIds?: string[];
    }): Promise<PriceBreakdown> {
        const { propertyId, checkIn, checkOut, rooms, mealPlanId, activityIds } = input;

        // Calculate number of nights
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            throw new AppError('Check-out date must be after check-in date', HttpStatus.BAD_REQUEST);
        }

        // Calculate room prices
        const roomPrices: PriceBreakdown['roomPrices'] = [];
        let roomTotal = 0;

        for (const roomInput of rooms) {
            const room = await Room.findById(roomInput.roomId);
            if (!room) {
                throw new AppError(`Room not found: ${roomInput.roomId}`, HttpStatus.NOT_FOUND);
            }

            // Verify room belongs to property
            if (room.propertyId.toString() !== propertyId) {
                throw new AppError('Room does not belong to this property', HttpStatus.BAD_REQUEST);
            }

            // Check availability
            const isAvailable = await this.availabilityService.checkAvailability(
                roomInput.roomId,
                checkIn,
                checkOut
            );
            if (!isAvailable) {
                throw new AppError(`Room ${room.roomName} is not available for selected dates`, HttpStatus.CONFLICT);
            }

            // Calculate price (TODO: check for custom pricing from availability)
            const pricePerNight = room.basePricePerNight;
            const extraPersons = Math.max(0, roomInput.guests - room.baseOccupancy);
            const extraCharges = extraPersons * room.extraPersonCharge * nights;
            const roomSubtotal = (pricePerNight * nights) + extraCharges;

            roomPrices.push({
                roomId: roomInput.roomId,
                roomName: room.roomName,
                nights,
                pricePerNight,
                totalGuests: roomInput.guests,
                subtotal: roomSubtotal
            });

            roomTotal += roomSubtotal;
        }

        // Calculate meal plan price (optional)
        let mealPlanPrice = 0;
        if (mealPlanId) {
            const mealPlan = await MealPlan.findById(mealPlanId);
            if (mealPlan && mealPlan.propertyId.toString() === propertyId) {
                const totalGuests = rooms.reduce((sum, r) => sum + r.guests, 0);
                mealPlanPrice = mealPlan.pricePerPersonPerDay * totalGuests * nights;
            }
        }

        // Calculate activity prices (optional)
        const activityPrices: PriceBreakdown['activityPrices'] = [];
        let activityTotal = 0;
        if (activityIds && activityIds.length > 0) {
            for (const activityId of activityIds) {
                const activity = await Activity.findById(activityId);
                if (activity && activity.propertyId && activity.propertyId.toString() === propertyId) {
                    const totalGuests = rooms.reduce((sum, r) => sum + r.guests, 0);
                    const activitySubtotal = activity.pricePerPerson * totalGuests;

                    activityPrices.push({
                        activityId,
                        activityName: activity.name,
                        participants: totalGuests,
                        pricePerPerson: activity.pricePerPerson,
                        subtotal: activitySubtotal
                    });

                    activityTotal += activitySubtotal;
                }
            }
        }

        // Calculate totals
        const subtotal = roomTotal + mealPlanPrice + activityTotal;
        const taxes = Math.round(subtotal * 0.12); // 12% tax (example)
        const finalPrice = subtotal + taxes;

        return {
            roomPrices,
            roomTotal,
            ...(mealPlanPrice > 0 && { mealPlanPrice }),
            ...(activityPrices.length > 0 && { activityPrices, activityTotal }),
            subtotal,
            taxes,
            finalPrice
        };
    }

    /**
     * Create a new booking (user side)
     */
    async createBooking(userId: string, partnerId: string, bookingDto: CreateBookingDto): Promise<IBooking> {
        const { propertyId, checkIn, checkOut, rooms, mealPlanId, activityIds, guestDetails } = bookingDto;

        // Calculate price
        const priceBreakdown = await this.calculateBookingPrice({
            propertyId,
            checkIn,
            checkOut,
            rooms,
            mealPlanId,
            activityIds
        });

        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        // Prepare room bookings
        const roomBookings = priceBreakdown.roomPrices.map(rp => ({
            roomId: new mongoose.Types.ObjectId(rp.roomId) as any,
            roomNumber: '', // Will be assigned by partner
            numberOfGuests: rp.totalGuests,
            pricePerNight: rp.pricePerNight,
            totalRoomPrice: rp.subtotal
        }));

        // Prepare activity bookings (if any)
        const activityBookings = priceBreakdown.activityPrices?.map(ap => ({
            activityId: new mongoose.Types.ObjectId(ap.activityId) as any,
            date: checkIn, // Simplified: assuming activity on check-in day
            timeSlot: 'Morning',
            participants: ap.participants,
            pricePerPerson: ap.pricePerPerson,
            totalActivityPrice: ap.subtotal
        })) || [];

        // Create booking
        const booking = new Booking({
            userId: new mongoose.Types.ObjectId(userId) as any,
            propertyId: new mongoose.Types.ObjectId(propertyId) as any,
            partnerId: new mongoose.Types.ObjectId(partnerId) as any,
            bookingType: 'accommodation',
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfNights: nights,
            totalGuests: guestDetails.length,
            guestDetails,
            roomBookings,
            mealPlanId: mealPlanId ? new mongoose.Types.ObjectId(mealPlanId) as any : undefined,
            mealPlanPrice: priceBreakdown.mealPlanPrice || 0,
            activityBookings,
            roomTotalPrice: priceBreakdown.roomTotal,
            mealTotalPrice: priceBreakdown.mealPlanPrice || 0,
            activityTotalPrice: priceBreakdown.activityTotal || 0,
            packageDiscount: 0,
            finalPrice: priceBreakdown.finalPrice,
            paymentStatus: 'completed', // Mock payment
            status: 'payment_completed',
            partnerApprovalStatus: 'pending',
            bookedAt: new Date(),
            bookingId: `BKG${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
        });

        await booking.save();

        // Block availability dates for all rooms
        for (const roomInput of rooms) {
            await this.availabilityService.blockRoomDates(
                roomInput.roomId,
                propertyId,
                checkIn,
                checkOut,
                booking._id.toString()
            );
        }

        return booking;
    }

    /**
     * Partner approves booking
     */
    async approveBooking(bookingId: string, partnerId: string): Promise<IBooking> {
        const booking = await Booking.findOne({ bookingId });

        if (!booking) {
            throw new AppError('Booking not found', HttpStatus.NOT_FOUND);
        }

        // Verify booking belongs to partner
        if (booking.partnerId.toString() !== partnerId) {
            throw new AppError('Unauthorized to approve this booking', HttpStatus.FORBIDDEN);
        }

        // Check current status
        if (booking.status !== 'payment_completed') {
            throw new AppError('Only payment completed bookings can be approved', HttpStatus.BAD_REQUEST);
        }

        if (booking.partnerApprovalStatus !== 'pending') {
            throw new AppError('Booking has already been processed', HttpStatus.BAD_REQUEST);
        }

        // Update booking
        booking.status = 'confirmed';
        booking.partnerApprovalStatus = 'approved';
        booking.approvedAt = new Date();
        booking.confirmedAt = new Date();

        await booking.save();

        return booking;
    }

    /**
     * Partner rejects booking
     */
    async rejectBooking(bookingId: string, partnerId: string, reason: string): Promise<IBooking> {
        const booking = await Booking.findOne({ bookingId });

        if (!booking) {
            throw new AppError('Booking not found', HttpStatus.NOT_FOUND);
        }

        // Verify booking belongs to partner
        if (booking.partnerId.toString() !== partnerId) {
            throw new AppError('Unauthorized to reject this booking', HttpStatus.FORBIDDEN);
        }

        // Check current status
        if (booking.status !== 'payment_completed') {
            throw new AppError('Only payment completed bookings can be rejected', HttpStatus.BAD_REQUEST);
        }

        if (booking.partnerApprovalStatus !== 'pending') {
            throw new AppError('Booking has already been processed', HttpStatus.BAD_REQUEST);
        }

        // Update booking
        booking.status = 'rejected';
        booking.partnerApprovalStatus = 'rejected';
        booking.rejectionReason = reason;
        booking.rejectedAt = new Date();

        await booking.save();

        // Release blocked availability dates
        await this.availabilityService.releaseRoomDates(booking._id.toString());

        return booking;
    }

    /**
     * Get bookings for a partner
     */
    async getPartnerBookings(
        partnerId: string,
        filters?: { status?: string; approvalStatus?: string }
    ): Promise<IBooking[]> {
        const query: any = { partnerId: new mongoose.Types.ObjectId(partnerId) as any };

        if (filters?.status) {
            query.status = filters.status;
        }

        if (filters?.approvalStatus) {
            query.partnerApprovalStatus = filters.approvalStatus;
        }

        const bookings = await Booking.find(query)
            .populate('userId', 'firstName lastName email phone')
            .populate('propertyId', 'propertyName')
            .sort({ createdAt: -1 });

        return bookings;
    }

    /**
     * Get bookings for a user
     */
    async getUserBookings(userId: string): Promise<IBooking[]> {
        const bookings = await Booking.find({ userId: new mongoose.Types.ObjectId(userId) as any })
            .populate('propertyId', 'propertyName coverImage city state')
            .sort({ createdAt: -1 });

        return bookings;
    }

    /**
     * Get single booking by ID
     */
    async getBookingById(bookingId: string): Promise<IBooking> {
        const booking = await Booking.findOne({ bookingId })
            .populate('userId', 'firstName lastName email phone')
            .populate('propertyId', 'propertyName city state coverImage')
            .populate('roomBookings.roomId', 'roomName roomType')
            .populate('mealPlanId', 'name')
            .populate('activityBookings.activityId', 'name');

        if (!booking) {
            throw new AppError('Booking not found', HttpStatus.NOT_FOUND);
        }

        return booking;
    }

    /**
     * Helper: Check room availability (internal use)
     */
    private async checkAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
        return this.availabilityService.checkAvailability(roomId, checkIn, checkOut);
    }
}
