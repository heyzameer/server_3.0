import mongoose, { Schema } from 'mongoose';
import { IActivity } from '../interfaces/IModel/IActivity';

const activitySchema = new Schema<IActivity>({
    activityType: {
        type: String,
        enum: ['property_based', 'platform_level'],
        required: true,
        index: true
    },

    // Property-based activities only
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        index: true,
        required: function (this: IActivity) {
            return this.activityType === 'property_based';
        }
    },

    // Platform-level activities only
    providerId: {
        type: Schema.Types.ObjectId,
        ref: 'ActivityProvider', // Make sure this model exists or use generic
        index: true,
        required: function (this: IActivity) {
            return this.activityType === 'platform_level';
        }
    },
    location: {
        address: { type: String },
        city: {
            type: String,
            index: true
        },
        coordinates: {
            type: [Number],
            index: '2dsphere'
        }
    },

    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: false, // Optional for backward compatibility or if not set initially
        default: 'Others',
        index: true
    },
    duration: {
        type: Number,
        required: true,
        min: 0
    },
    pricePerPerson: {
        type: Number,
        required: true,
        min: 0
    },
    maxParticipants: {
        type: Number,
        required: true,
        min: 1
    },

    availableTimeSlots: [{ type: String }],
    requiresBooking: {
        type: Boolean,
        default: true
    },

    images: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true }
}, {
    timestamps: true
});

// Since validation logic with `required: function` works on document level, 
// complex conditional validation is better handled here. 
// Note: `this` context is important in validator functions.

export const Activity = mongoose.model<IActivity>('Activity', activitySchema);
