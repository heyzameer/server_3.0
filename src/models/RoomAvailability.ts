import mongoose, { Schema } from 'mongoose';
import { IRoomAvailability } from '../interfaces/IModel/IRoomAvailability';

const roomAvailabilitySchema = new Schema<IRoomAvailability>({
    roomId: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true
    },
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },

    date: {
        type: Date,
        required: true,
        index: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockedReason: {
        type: String,
        enum: ['booking', 'maintenance', 'manual']
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking'
    },

    customPricing: {
        basePricePerNight: { type: Number },
        extraPersonCharge: { type: Number }
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate entries for same room and date
roomAvailabilitySchema.index({ roomId: 1, date: 1 }, { unique: true });

// Index for querying propertyId and date range
roomAvailabilitySchema.index({ propertyId: 1, date: 1 });

export const RoomAvailability = mongoose.model<IRoomAvailability>('RoomAvailability', roomAvailabilitySchema);
