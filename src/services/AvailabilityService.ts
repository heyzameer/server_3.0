import { injectable, inject } from 'tsyringe';
import { IRoomAvailabilityRepository } from '../interfaces/IRepository/IRoomAvailabilityRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IRoomRepository } from '../interfaces/IRepository/IRoomRepository';
import { IBookingRepository } from '../interfaces/IRepository/IBookingRepository';
import { IRoom } from '../interfaces/IModel/IRoom';
import { IAvailabilityService } from '../interfaces/IService/IAvailabilityService';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';

@injectable()
export class AvailabilityService implements IAvailabilityService {
    constructor(
        @inject('RoomAvailabilityRepository') private availabilityRepository: IRoomAvailabilityRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository,
        @inject('RoomRepository') private roomRepository: IRoomRepository,
        @inject('BookingRepository') private bookingRepository: IBookingRepository
    ) { }

    private async resolveProperty(id: string) {
        if (mongoose.Types.ObjectId.isValid(id)) {
            const prop = await this.propertyRepository.findById(id);
            if (prop) return prop;
        }
        return this.propertyRepository.findByPropertyId(id);
    }

    async getAvailableRooms(propertyId: string, checkIn: Date, checkOut: Date, guests: number): Promise<IRoom[]> {
        const allRooms = await this.roomRepository.find({
            propertyId,
            isActive: true,
            minOccupancy: { $lte: guests },
            maxOccupancy: { $gte: guests }
        });

        const availableRooms: IRoom[] = [];
        for (const room of allRooms) {
            const isAvailable = await this.availabilityRepository.checkAvailability(
                room._id.toString(),
                checkIn,
                checkOut
            );
            if (isAvailable) {
                availableRooms.push(room);
            }
        }

        return availableRooms;
    }

    async blockRoomDates(
        roomId: string,
        propertyId: string,
        checkIn: Date,
        checkOut: Date,
        bookingId: string,
        session?: mongoose.ClientSession
    ): Promise<void> {
        const property = await this.resolveProperty(propertyId);
        if (!property) throw new AppError('Property not found', HttpStatus.NOT_FOUND);

        const dates = this.generateDateRange(checkIn, checkOut);
        await this.availabilityRepository.blockDates(
            roomId,
            property._id.toString(),
            dates,
            'booking',
            bookingId,
            session
        );
    }

    async releaseRoomDates(bookingId: string, session?: mongoose.ClientSession): Promise<void> {
        await this.availabilityRepository.releaseDates(bookingId, session);
    }

    async manualBlockDates(roomId: string, propertyId: string, dates: Date[], reason: string): Promise<void> {
        const property = await this.resolveProperty(propertyId);
        if (!property) throw new AppError('Property not found', HttpStatus.NOT_FOUND);

        const validReasons: ('booking' | 'maintenance' | 'manual')[] = ['booking', 'maintenance', 'manual'];
        const blockedReason = validReasons.includes(reason as any) ? (reason as 'booking' | 'maintenance' | 'manual') : 'manual';

        await this.availabilityRepository.blockDates(roomId, property._id.toString(), dates, blockedReason);
    }

    async getAvailabilityCalendar(roomId: string, month?: number, year?: number, start?: Date, end?: Date): Promise<any> {
        let startDate: Date;
        let endDate: Date;

        if (start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
        } else if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        } else {
            throw new AppError('Invalid date parameters', HttpStatus.BAD_REQUEST);
        }

        const availability = await this.availabilityRepository.getAvailabilityCalendar(roomId, startDate, endDate);
        const room = await this.roomRepository.findById(roomId);
        if (!room) throw new AppError('Room not found', HttpStatus.NOT_FOUND);

        const calendar: any[] = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = this.formatDate(currentDate);
            const availabilityData = availability.find(a => this.formatDate(new Date(a.date)) === dateStr);

            calendar.push({
                date: dateStr,
                isBlocked: availabilityData?.isBlocked || false,
                blockedReason: availabilityData?.blockedReason,
                bookingId: availabilityData?.bookingId,
                pricing: availabilityData?.customPricing || {
                    basePricePerNight: room.basePricePerNight,
                    extraPersonCharge: room.extraPersonCharge
                }
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { roomId, month: month || startDate.getMonth() + 1, year: year || startDate.getFullYear(), calendar };
    }

    async setCustomPricing(roomId: string, propertyId: string, date: Date, pricing: { basePricePerNight: number, extraPersonCharge: number }): Promise<void> {
        const property = await this.resolveProperty(propertyId);
        if (!property) throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        await this.availabilityRepository.setCustomPricing(roomId, property._id.toString(), date, pricing);
    }

    async checkAvailability(roomId: string, checkIn: Date, checkOut: Date, userId?: string): Promise<boolean> {
        const endDate = new Date(checkOut);
        endDate.setDate(endDate.getDate() - 1);

        const availability = await this.availabilityRepository.getAvailabilityCalendar(roomId, checkIn, endDate);

        for (const block of availability) {
            if (block.isBlocked) {
                if (block.blockedReason === 'booking' && block.bookingId) {
                    const booking = await this.bookingRepository.findById(block.bookingId.toString());
                    if (booking) {
                        const isSameUser = userId && (booking.userId.toString() === userId.toString());
                        if (isSameUser && booking.status === 'pending_payment') continue;
                        if (booking.status === 'pending_payment') {
                            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
                            if (booking.createdAt < fifteenMinutesAgo) continue;
                        }
                    }
                }
                return false;
            }
        }
        return true;
    }

    private generateDateRange(checkIn: Date, checkOut: Date): Date[] {
        const dates: Date[] = [];
        const currentDate = new Date(checkIn);
        while (currentDate < checkOut) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }
}
