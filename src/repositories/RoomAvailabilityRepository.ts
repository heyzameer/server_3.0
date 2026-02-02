import { IRoomAvailability } from '../interfaces/IModel/IRoomAvailability';
import { RoomAvailability } from '../models/RoomAvailability';
import mongoose from 'mongoose';

export interface IRoomAvailabilityRepository {
    checkAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean>;
    blockDates(roomId: string, propertyId: string, dates: Date[], reason: 'booking' | 'maintenance' | 'manual', bookingId?: string): Promise<void>;
    releaseDates(bookingId: string): Promise<void>;
    getAvailabilityCalendar(roomId: string, startDate: Date, endDate: Date): Promise<IRoomAvailability[]>;
    setCustomPricing(roomId: string, propertyId: string, date: Date, pricing: { basePricePerNight: number, extraPersonCharge: number }): Promise<IRoomAvailability>;
    unblockDates(roomId: string, dates: Date[]): Promise<void>;
}

export class RoomAvailabilityRepository implements IRoomAvailabilityRepository {
    /**
     * Check if a room is available for a given date range
     * Returns false if any date in the range is blocked
     */
    async checkAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
        const blockedDates = await RoomAvailability.countDocuments({
            roomId: new mongoose.Types.ObjectId(roomId) as any,
            date: {
                $gte: checkIn,
                $lt: checkOut
            },
            isBlocked: true
        });

        return blockedDates === 0;
    }

    /**
     * Block dates for a room (for booking, maintenance, or manual blocking)
     */
    async blockDates(
        roomId: string,
        propertyId: string,
        dates: Date[],
        reason: 'booking' | 'maintenance' | 'manual',
        bookingId?: string
    ): Promise<void> {
        const operations = dates.map(date => ({
            updateOne: {
                filter: { roomId: new mongoose.Types.ObjectId(roomId) as any, date },
                update: {
                    $set: {
                        roomId: new mongoose.Types.ObjectId(roomId) as any,
                        propertyId: new mongoose.Types.ObjectId(propertyId) as any,
                        date,
                        isBlocked: true,
                        blockedReason: reason,
                        ...(bookingId && { bookingId: new mongoose.Types.ObjectId(bookingId) as any })
                    }
                },
                upsert: true
            }
        }));

        await RoomAvailability.bulkWrite(operations);
    }

    /**
     * Release all dates associated with a booking (for cancellations)
     */
    async releaseDates(bookingId: string): Promise<void> {
        await RoomAvailability.updateMany(
            { bookingId: new mongoose.Types.ObjectId(bookingId) as any },
            {
                $set: {
                    isBlocked: false,
                    blockedReason: undefined,
                    bookingId: undefined
                }
            }
        );
    }

    /**
     * Get availability calendar for a room within a date range
     */
    async getAvailabilityCalendar(roomId: string, startDate: Date, endDate: Date): Promise<IRoomAvailability[]> {
        return await RoomAvailability.find({
            roomId: new mongoose.Types.ObjectId(roomId) as any,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: 1 });
    }

    /**
     * Set custom pricing for a specific date
     */
    async setCustomPricing(
        roomId: string,
        propertyId: string,
        date: Date,
        pricing: { basePricePerNight: number, extraPersonCharge: number }
    ): Promise<IRoomAvailability> {
        const updated = await RoomAvailability.findOneAndUpdate(
            { roomId: new mongoose.Types.ObjectId(roomId) as any, date },
            {
                $set: {
                    roomId: new mongoose.Types.ObjectId(roomId) as any,
                    propertyId: new mongoose.Types.ObjectId(propertyId) as any,
                    date,
                    customPricing: pricing
                }
            },
            { upsert: true, new: true }
        );

        return updated!;
    }

    /**
     * Unblock specific dates for a room (manual unblocking)
     */
    async unblockDates(roomId: string, dates: Date[]): Promise<void> {
        await RoomAvailability.updateMany(
            {
                roomId: new mongoose.Types.ObjectId(roomId) as any,
                date: { $in: dates },
                blockedReason: 'manual' // Only unblock manually blocked dates
            },
            {
                $set: {
                    isBlocked: false,
                    blockedReason: undefined
                }
            }
        );
    }
}
