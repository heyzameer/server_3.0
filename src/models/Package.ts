import mongoose, { Schema } from 'mongoose';
import { IPackage } from '../interfaces/IModel/IPackage';

const packageSchema = new Schema<IPackage>({
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },

    packageName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },

    roomTypes: [{
        type: String,
        required: true
    }],
    numberOfNights: {
        type: Number,
        required: true,
        min: 1
    },
    mealPlanId: {
        type: Schema.Types.ObjectId,
        ref: 'MealPlan'
    },
    includedActivities: [{
        activityId: {
            type: Schema.Types.ObjectId,
            ref: 'Activity',
            required: true
        },
        sessionsIncluded: {
            type: Number,
            required: true,
            min: 1
        }
    }],

    packagePricePerPerson: {
        type: Number,
        required: true,
        min: 0
    },
    minPersons: {
        type: Number,
        required: true,
        min: 1
    },
    maxPersons: {
        type: Number,
        required: true,
        min: 1
    },

    validFrom: {
        type: Date,
        required: true
    },
    validUntil: {
        type: Date,
        required: true
    },
    isActive: { type: Boolean, default: true, index: true },

    images: [{ type: String }]
}, {
    timestamps: true
});

// Validation: validUntil must be after validFrom
packageSchema.pre('save', function (next) {
    if (this.validUntil <= this.validFrom) {
        next(new Error('validUntil must be after validFrom'));
    }
    if (this.maxPersons < this.minPersons) {
        next(new Error('maxPersons must be >= minPersons'));
    }
    next();
});

export const Package = mongoose.model<IPackage>('Package', packageSchema);
