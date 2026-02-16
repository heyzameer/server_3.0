import { Document, ObjectId } from 'mongoose';

interface ActivityLocation {
    address: string;
    city: string;
    coordinates: number[]; // [longitude, latitude]
}

export interface IActivity extends Document {
    _id: ObjectId;

    // Activity Type
    activityType: 'property_based' | 'platform_level';

    // Property-based activities
    propertyId?: ObjectId;

    // Platform-level activities
    providerId?: ObjectId;
    location?: ActivityLocation;

    name: string;
    description: string;
    category: string; // e.g., "Water Activities", "Resort Activities"
    duration: number; // in minutes
    pricePerPerson: number;
    maxParticipants: number;

    availableTimeSlots: string[];
    requiresBooking: boolean;

    images: string[];
    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}
