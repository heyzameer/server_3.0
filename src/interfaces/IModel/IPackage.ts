import { Document, ObjectId } from 'mongoose';

interface IncludedActivity {
    activityId: ObjectId;
    sessionsIncluded: number;
}

export interface IPackage extends Document {
    _id: ObjectId;
    propertyId: ObjectId;

    packageName: string;
    description: string;

    roomTypes: string[];
    numberOfNights: number;
    mealPlanId?: ObjectId;
    includedActivities: IncludedActivity[];

    packagePricePerPerson: number;
    minPersons: number;
    maxPersons: number;

    validFrom: Date;
    validUntil: Date;
    isActive: boolean;

    images: string[];
    createdAt: Date;
    updatedAt: Date;
}
