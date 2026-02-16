import mongoose, { Schema } from 'mongoose';
import { IBooking } from '../interfaces/IModel/IBooking';

const bookingSchema = new Schema<IBooking>({
    bookingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },
    partnerId: {
        type: Schema.Types.ObjectId,
        ref: 'Partner',
        required: true,
        index: true
    },

    bookingType: {
        type: String,
        enum: ['accommodation', 'activity_only', 'package'],
        required: true
    },

    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date },
    numberOfNights: { type: Number, min: 0 },

    totalGuests: { type: Number, required: true, min: 1 },
    guestDetails: [{
        name: { type: String, required: true },
        age: { type: Number, required: true },
        gender: { type: String, enum: ['Male', 'Female', 'Other'] }
    }],

    roomBookings: [{
        roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
        roomNumber: { type: String },
        numberOfGuests: { type: Number, required: true },
        pricePerNight: { type: Number, required: true },
        totalRoomPrice: { type: Number, required: true }
    }],

    mealPlanId: { type: Schema.Types.ObjectId, ref: 'MealPlan' },
    mealPlanPrice: { type: Number, default: 0 },

    activityBookings: [{
        activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
        date: { type: Date, required: true },
        timeSlot: { type: String },
        participants: { type: Number, required: true },
        pricePerPerson: { type: Number, required: true },
        totalActivityPrice: { type: Number, required: true }
    }],

    packageId: { type: Schema.Types.ObjectId, ref: 'Package' },

    roomTotalPrice: { type: Number, default: 0 },
    mealTotalPrice: { type: Number, default: 0 },
    activityTotalPrice: { type: Number, default: 0 },
    packageDiscount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
        index: true
    },
    paymentId: { type: String },

    status: {
        type: String,
        enum: ['pending_payment', 'payment_completed', 'confirmed', 'rejected', 'checked_in', 'checked_out', 'completed', 'cancelled'],
        default: 'pending_payment',
        index: true
    },

    // Partner approval workflow
    partnerApprovalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    rejectedAt: { type: Date },

    cancellationReason: { type: String },

    // Refund workflow
    refundStatus: {
        type: String,
        enum: ['not_requested', 'requested', 'approved', 'rejected', 'processed'],
        default: 'not_requested',
        index: true
    },
    refundAmount: { type: Number },
    refundRequestedAt: { type: Date },
    refundProcessedAt: { type: Date },
    refundReason: { type: String },

    bookedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date }
}, {
    timestamps: true
});

// Indexes for partner booking queries
bookingSchema.index({ partnerId: 1, status: 1 });
bookingSchema.index({ partnerId: 1, partnerApprovalStatus: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

// Generate unique booking ID
bookingSchema.pre('save', async function (next) {
    if (!this.bookingId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.bookingId = `BKG${year}${month}${day}${random}`;
    }
    next();
});

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
