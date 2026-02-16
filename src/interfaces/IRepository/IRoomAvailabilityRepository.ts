import { IRoomAvailability } from '../IModel/IRoomAvailability';
import mongoose from 'mongoose';

export interface IRoomAvailabilityRepository {
    checkAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean>;
    blockDates(roomId: string, propertyId: string, dates: Date[], reason: 'booking' | 'maintenance' | 'manual', bookingId?: string, session?: mongoose.ClientSession): Promise<void>;
    releaseDates(bookingId: string, session?: mongoose.ClientSession): Promise<void>;
    getAvailabilityCalendar(roomId: string, startDate: Date, endDate: Date): Promise<IRoomAvailability[]>;
    setCustomPricing(roomId: string, propertyId: string, date: Date, pricing: { basePricePerNight: number, extraPersonCharge: number }): Promise<IRoomAvailability>;
    unblockDates(roomId: string, dates: Date[]): Promise<void>;
}
