import { Document, ObjectId } from 'mongoose';

export interface IMealPlan extends Document {
    _id: ObjectId;
    propertyId: ObjectId;

    name: string;
    description: string;
    mealsIncluded: string[];
    pricePerPersonPerDay: number;

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
