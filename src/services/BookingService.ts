import { injectable, inject } from 'tsyringe';
import { IBooking } from '../interfaces/IModel/IBooking';
import { IAvailabilityService } from '../interfaces/IService/IAvailabilityService';
import { IBookingService, PriceBreakdown, CreateBookingDto } from '../interfaces/IService/IBookingService';
import { IRoomRepository } from '../interfaces/IRepository/IRoomRepository';
import { IMealPlanRepository } from '../interfaces/IRepository/IMealPlanRepository';
import { IActivityRepository } from '../interfaces/IRepository/IActivityRepository';
import { IPackageRepository } from '../interfaces/IRepository/IPackageRepository';
import { IBookingRepository } from '../interfaces/IRepository/IBookingRepository';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';

@injectable()
export class BookingService implements IBookingService {
    constructor(
        @inject('AvailabilityService') private availabilityService: IAvailabilityService,
        @inject('BookingRepository') private bookingRepository: IBookingRepository,
        @inject('RoomRepository') private roomRepository: IRoomRepository,
        @inject('PackageRepository') private packageRepository: IPackageRepository,
        @inject('MealPlanRepository') private mealPlanRepository: IMealPlanRepository,
        @inject('ActivityRepository') private activityRepository: IActivityRepository
    ) { }

    /**
     * Calculate booking price breakdown
     */
    async calculateBookingPrice(input: {
        propertyId: string;
        checkIn: Date;
        checkOut: Date;
        rooms: { roomId: string; guests: number }[];
        mealPlanId?: string;
        activityIds?: string[];
        packageId?: string;
        userId?: string;
    }): Promise<PriceBreakdown> {
        const { checkIn, checkOut, rooms, mealPlanId, activityIds, packageId, userId } = input;

        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            throw new AppError('Check-out date must be after check-in date', HttpStatus.BAD_REQUEST);
        }

        const roomPrices: PriceBreakdown['roomPrices'] = [];
        let roomTotal = 0;
        const totalGuests = rooms.reduce((sum, r) => sum + r.guests, 0);

        if (packageId) {
            const pkg = await this.packageRepository.findById(packageId);
            if (!pkg) throw new AppError('Package not found', HttpStatus.NOT_FOUND);

            roomTotal = pkg.packagePricePerPerson * totalGuests;

            for (const roomInput of rooms) {
                const room = await this.roomRepository.findById(roomInput.roomId);
                if (!room) throw new AppError(`Room not found: ${roomInput.roomId}`, HttpStatus.NOT_FOUND);

                const isAvailable = await this.availabilityService.checkAvailability(roomInput.roomId, checkIn, checkOut, userId);
                if (!isAvailable) throw new AppError(`Room ${room.roomName} is not available.`, HttpStatus.CONFLICT);

                roomPrices.push({
                    roomId: roomInput.roomId,
                    roomName: room.roomName,
                    nights,
                    pricePerNight: 0,
                    totalGuests: roomInput.guests,
                    subtotal: 0
                });
            }
        } else {
            for (const roomInput of rooms) {
                const room = await this.roomRepository.findById(roomInput.roomId);
                if (!room) throw new AppError(`Room not found: ${roomInput.roomId}`, HttpStatus.NOT_FOUND);

                const isAvailable = await this.availabilityService.checkAvailability(roomInput.roomId, checkIn, checkOut, userId);
                if (!isAvailable) throw new AppError(`Room ${room.roomName} is not available.`, HttpStatus.CONFLICT);

                const price = room.basePricePerNight + (Math.max(0, roomInput.guests - 2) * room.extraPersonCharge);
                const subtotal = price * nights;

                roomPrices.push({
                    roomId: roomInput.roomId,
                    roomName: room.roomName,
                    nights,
                    pricePerNight: price,
                    totalGuests: roomInput.guests,
                    subtotal
                });
                roomTotal += subtotal;
            }
        }

        let mealPlanPrice = 0;
        if (mealPlanId) {
            const mealPlan = await this.mealPlanRepository.findById(mealPlanId);
            if (mealPlan) mealPlanPrice = mealPlan.pricePerPersonPerDay * totalGuests * (packageId ? 0 : nights);
        }

        const activityBreakdown: PriceBreakdown['activityPrices'] = [];
        let activityTotal = 0;
        if (activityIds && activityIds.length > 0) {
            for (const activityId of activityIds) {
                const act = await this.activityRepository.findById(activityId);
                if (act) {
                    const subtotal = act.pricePerPerson * totalGuests;
                    activityBreakdown.push({
                        activityId,
                        activityName: act.name,
                        participants: totalGuests,
                        pricePerPerson: act.pricePerPerson,
                        subtotal
                    });
                    activityTotal += subtotal;
                }
            }
        }

        const subtotal = roomTotal + mealPlanPrice + activityTotal;
        const taxes = subtotal * 0.18;
        return {
            roomPrices,
            roomTotal,
            mealPlanPrice,
            activityPrices: activityBreakdown,
            activityTotal,
            subtotal,
            taxes,
            finalPrice: subtotal + taxes
        };
    }

    async createBooking(userId: string, partnerId: string, bookingDto: CreateBookingDto): Promise<IBooking> {
        const breakdown = await this.calculateBookingPrice({ ...bookingDto, rooms: bookingDto.rooms as any });

        const totalGuests = bookingDto.rooms.reduce((sum, r) => sum + r.guests, 0);
        const nights = Math.ceil((new Date(bookingDto.checkOut).getTime() - new Date(bookingDto.checkIn).getTime()) / (1000 * 60 * 60 * 24));

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const bookingId = `BKG${dateStr}${random}`;

        const booking = await this.bookingRepository.create({
            ...bookingDto,
            bookingId,
            userId: new mongoose.Types.ObjectId(userId) as any,
            partnerId: new mongoose.Types.ObjectId(partnerId) as any,
            propertyId: new mongoose.Types.ObjectId(bookingDto.propertyId) as any,
            bookingType: 'accommodation',
            checkInDate: bookingDto.checkIn,
            checkOutDate: bookingDto.checkOut,
            numberOfNights: nights,
            totalGuests,
            roomBookings: breakdown.roomPrices.map(r => ({
                roomId: new mongoose.Types.ObjectId(r.roomId) as any,
                roomNumber: '',
                numberOfGuests: r.totalGuests,
                pricePerNight: r.pricePerNight,
                totalRoomPrice: r.subtotal
            })),
            mealPlanId: bookingDto.mealPlanId ? new mongoose.Types.ObjectId(bookingDto.mealPlanId) as any : undefined,
            activityBookings: breakdown.activityPrices?.map(a => ({
                activityId: new mongoose.Types.ObjectId(a.activityId) as any,
                date: bookingDto.checkIn,
                timeSlot: 'Morning',
                participants: a.participants,
                pricePerPerson: a.pricePerPerson,
                totalActivityPrice: a.subtotal
            })) || [],
            finalPrice: breakdown.finalPrice,
            status: 'payment_completed',
            paymentStatus: 'completed'
        });

        for (const room of bookingDto.rooms) {
            await this.availabilityService.blockRoomDates(room.roomId, bookingDto.propertyId, bookingDto.checkIn, bookingDto.checkOut, booking._id.toString());
        }

        return booking;
    }

    async approveBooking(bookingId: string, partnerId: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        if (booking.partnerId.toString() !== partnerId) throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);

        return (await this.bookingRepository.update(booking._id.toString(), {
            status: 'confirmed',
            partnerApprovalStatus: 'approved',
            approvedAt: new Date(),
            confirmedAt: new Date()
        }))!;
    }

    async rejectBooking(bookingId: string, partnerId: string, reason: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        if (booking.partnerId.toString() !== partnerId) throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);

        await this.availabilityService.releaseRoomDates(booking._id.toString());

        return (await this.bookingRepository.update(booking._id.toString(), {
            status: 'rejected',
            partnerApprovalStatus: 'rejected',
            rejectionReason: reason,
            rejectedAt: new Date()
        }))!;
    }

    async completeBooking(bookingId: string, partnerId: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        if (booking.partnerId.toString() !== partnerId) throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);
        return (await this.bookingRepository.update(booking._id.toString(), { status: 'completed' }))!;
    }

    async checkInBooking(bookingId: string, partnerId: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        if (booking.partnerId.toString() !== partnerId) throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);
        return (await this.bookingRepository.update(booking._id.toString(), { status: 'checked_in' }))!;
    }

    async checkOutBooking(bookingId: string, partnerId: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        if (booking.partnerId.toString() !== partnerId) throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);
        return (await this.bookingRepository.update(booking._id.toString(), { status: 'checked_out' }))!;
    }

    async cancelBooking(bookingId: string, userId: string, reason: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        if (booking.userId.toString() !== userId) throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);

        await this.availabilityService.releaseRoomDates(booking._id.toString());
        return (await this.bookingRepository.update(booking._id.toString(), {
            status: 'cancelled',
            cancellationReason: reason,
            cancelledAt: new Date()
        }))!;
    }

    async requestRefund(bookingId: string, userId: string, reason: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        return (await this.bookingRepository.update(booking._id.toString(), {
            refundStatus: 'requested',
            refundReason: reason,
            refundRequestedAt: new Date()
        }))!;
    }

    async processRefund(bookingId: string, approved: boolean, _adminNote?: string): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        return (await this.bookingRepository.update(booking._id.toString(), {
            refundStatus: approved ? 'approved' : 'rejected',
            refundProcessedAt: approved ? new Date() : undefined
        }))!;
    }

    async getPartnerBookings(partnerId: string, filters: any = {}): Promise<IBooking[]> {
        return this.bookingRepository.findByPartnerId(partnerId, filters);
    }

    async getUserBookings(userId: string): Promise<IBooking[]> {
        return this.bookingRepository.findByUserId(userId);
    }

    async getBookingById(bookingId: string): Promise<IBooking> {
        let booking: IBooking | null = null;

        // 1. Try fetching by MongoDB _id first if it's a valid hex string
        if (mongoose.Types.ObjectId.isValid(bookingId)) {
            booking = await this.bookingRepository.findOne(
                { _id: new mongoose.Types.ObjectId(bookingId) },
                {
                    populate: [
                        { path: 'userId', select: 'fullName email phone' },
                        { path: 'propertyId', select: 'propertyName address city' },
                        { path: 'roomBookings.roomId', select: 'roomName' },
                        { path: 'activityBookings.activityId', select: 'name' }
                    ]
                }
            );
        }

        // 2. If not found by _id, try fetching by custom bookingId (e.g., BKG202602156340)
        if (!booking) {
            booking = await this.bookingRepository.findOne(
                { bookingId },
                {
                    populate: [
                        { path: 'userId', select: 'fullName email phone' },
                        { path: 'propertyId', select: 'propertyName address city' },
                        { path: 'roomBookings.roomId', select: 'roomName' },
                        { path: 'activityBookings.activityId', select: 'name' }
                    ]
                }
            );
        }

        if (!booking) {
            throw new AppError('Booking not found', HttpStatus.NOT_FOUND);
        }

        return booking;
    }

    async getAllBookings(filters?: any): Promise<IBooking[]> {
        return this.bookingRepository.find(filters || {});
    }

    async updateBooking(bookingId: string, updateData: any): Promise<IBooking> {
        const booking = await this.getBookingByCustomId(bookingId);
        return (await this.bookingRepository.update(booking._id.toString(), updateData))!;
    }

    async deleteBooking(bookingId: string): Promise<void> {
        const booking = await this.getBookingByCustomId(bookingId);
        await this.bookingRepository.delete(booking._id.toString());
    }

    private async getBookingByCustomId(bookingId: string): Promise<IBooking> {
        const booking = await this.bookingRepository.findOne({ bookingId });
        if (!booking) throw new AppError('Booking not found', HttpStatus.NOT_FOUND);
        return booking;
    }
}
