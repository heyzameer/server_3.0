import { Document, ObjectId } from 'mongoose';

export interface IRoomAvailability extends Document {
    _id: ObjectId;
    roomId: ObjectId;
    propertyId: ObjectId;

    date: Date;
    isBlocked: boolean;
    blockedReason?: 'booking' | 'maintenance' | 'manual';
    bookingId?: ObjectId;

    customPricing?: {
        basePricePerNight: number;
        extraPersonCharge: number;
    };

    createdAt: Date;
    updatedAt: Date;
}
