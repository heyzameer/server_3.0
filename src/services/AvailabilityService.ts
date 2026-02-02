import { injectable, inject } from 'tsyringe';
import { IRoomAvailabilityRepository } from '../repositories/RoomAvailabilityRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IRoom } from '../interfaces/IModel/IRoom';
import { Room } from '../models/Room';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';

export interface IAvailabilityService {
    getAvailableRooms(propertyId: string, checkIn: Date, checkOut: Date, guests: number): Promise<IRoom[]>;
    blockRoomDates(roomId: string, propertyId: string, checkIn: Date, checkOut: Date, bookingId: string): Promise<void>;
    releaseRoomDates(bookingId: string): Promise<void>;
    manualBlockDates(roomId: string, propertyId: string, dates: Date[], reason: string): Promise<void>;
    getAvailabilityCalendar(roomId: string, month?: number, year?: number, start?: Date, end?: Date): Promise<any>;
    setCustomPricing(roomId: string, propertyId: string, date: Date, pricing: { basePricePerNight: number, extraPersonCharge: number }): Promise<void>;
    checkAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean>;
}

@injectable()
export class AvailabilityService implements IAvailabilityService {
    constructor(
        @inject('RoomAvailabilityRepository') private availabilityRepository: IRoomAvailabilityRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository
    ) { }

    private async resolveProperty(id: string) {
        if (mongoose.Types.ObjectId.isValid(id)) {
            const prop = await this.propertyRepository.findById(id);
            if (prop) return prop;
        }
        return this.propertyRepository.findByPropertyId(id);
    }

    /**
     * Get all available rooms for a property within a date range
     * Filters by guest capacity and availability
     */
    async getAvailableRooms(propertyId: string, checkIn: Date, checkOut: Date, guests: number): Promise<IRoom[]> {
        // Find all rooms in the property
        const allRooms = await Room.find({
            propertyId,
            isActive: true,
            minOccupancy: { $lte: guests },
            maxOccupancy: { $gte: guests }
        });

        // Check availability for each room
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

    /**
     * Block room dates for a booking
     */
    async blockRoomDates(
        roomId: string,
        propertyId: string,
        checkIn: Date,
        checkOut: Date,
        bookingId: string
    ): Promise<void> {
        const property = await this.resolveProperty(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        const dates = this.generateDateRange(checkIn, checkOut);

        await this.availabilityRepository.blockDates(
            roomId,
            property._id.toString(),
            dates,
            'booking',
            bookingId
        );
    }

    /**
     * Release all dates for a booking (on cancellation)
     */
    async releaseRoomDates(bookingId: string): Promise<void> {
        await this.availabilityRepository.releaseDates(bookingId);
    }

    /**
     * Manually block dates (for maintenance or manual blocking)
     */
    async manualBlockDates(
        roomId: string,
        propertyId: string,
        dates: Date[],
        reason: string
    ): Promise<void> {
        const property = await this.resolveProperty(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        const validReasons: ('booking' | 'maintenance' | 'manual')[] = ['booking', 'maintenance', 'manual'];
        const blockedReason = validReasons.includes(reason as any) ? (reason as 'booking' | 'maintenance' | 'manual') : 'manual';

        await this.availabilityRepository.blockDates(
            roomId,
            property._id.toString(),
            dates,
            blockedReason
        );
    }

    /**
     * Get availability calendar for a specific month
     */
    async getAvailabilityCalendar(roomId: string, month?: number, year?: number, start?: Date, end?: Date): Promise<any> {
        let startDate: Date;
        let endDate: Date;

        if (start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
        } else if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0); // Last day of month
        } else {
            throw new AppError('Invalid date parameters. Provide either (month, year) or (startDate, endDate)', HttpStatus.BAD_REQUEST);
        }

        const availability = await this.availabilityRepository.getAvailabilityCalendar(
            roomId,
            startDate,
            endDate
        );

        // Get room details for default pricing
        const room = await Room.findById(roomId);
        if (!room) {
            throw new AppError('Room not found', HttpStatus.NOT_FOUND);
        }

        // Build calendar response
        const calendar: any[] = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = this.formatDate(currentDate);
            const availabilityData = availability.find(
                a => this.formatDate(new Date(a.date)) === dateStr
            );

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

        return {
            roomId,
            month: month || startDate.getMonth() + 1,
            year: year || startDate.getFullYear(),
            calendar
        };
    }

    /**
     * Set custom pricing for a specific date
     */
    async setCustomPricing(
        roomId: string,
        propertyId: string,
        date: Date,
        pricing: { basePricePerNight: number, extraPersonCharge: number }
    ): Promise<void> {
        const property = await this.resolveProperty(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        await this.availabilityRepository.setCustomPricing(roomId, property._id.toString(), date, pricing);
    }

    /**
     * Helper: Generate array of dates between check-in and check-out
     */
    private generateDateRange(checkIn: Date, checkOut: Date): Date[] {
        const dates: Date[] = [];
        const currentDate = new Date(checkIn);

        while (currentDate < checkOut) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    /**
     * Helper: Format date as YYYY-MM-DD
     */
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Check availability for a specific room
     */
    async checkAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
        return this.availabilityRepository.checkAvailability(roomId, checkIn, checkOut);
    }
}
