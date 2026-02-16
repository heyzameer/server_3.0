import { IRoom } from '../IModel/IRoom';
import mongoose from 'mongoose';

export interface IAvailabilityService {
    getAvailableRooms(propertyId: string, checkIn: Date, checkOut: Date, guests: number): Promise<IRoom[]>;
    blockRoomDates(roomId: string, propertyId: string, checkIn: Date, checkOut: Date, bookingId: string, session?: mongoose.ClientSession): Promise<void>;
    releaseRoomDates(bookingId: string, session?: mongoose.ClientSession): Promise<void>;
    manualBlockDates(roomId: string, propertyId: string, dates: Date[], reason: string): Promise<void>;
    getAvailabilityCalendar(roomId: string, month?: number, year?: number, start?: Date, end?: Date): Promise<any>;
    setCustomPricing(roomId: string, propertyId: string, date: Date, pricing: { basePricePerNight: number, extraPersonCharge: number }): Promise<void>;
    checkAvailability(roomId: string, checkIn: Date, checkOut: Date, userId?: string): Promise<boolean>;
}
