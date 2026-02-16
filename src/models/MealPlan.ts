import mongoose, { Schema } from 'mongoose';
import { IMealPlan } from '../interfaces/IModel/IMealPlan';

const mealPlanSchema = new Schema<IMealPlan>({
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    mealsIncluded: [{
        type: String,
        enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'High Tea']
    }],
    pricePerPersonPerDay: {
        type: Number,
        required: true,
        min: 0
    },

    isActive: { type: Boolean, default: true, index: true }
}, {
    timestamps: true
});

export const MealPlan = mongoose.model<IMealPlan>('MealPlan', mealPlanSchema);
