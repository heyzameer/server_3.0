import { Document, ObjectId } from 'mongoose';

export interface IRoom extends Document {
    _id: ObjectId;
    propertyId: ObjectId;

    // Room Identification
    roomName: string;
    roomNumber: string;
    roomType: string;
    sharingType: string;

    // Occupancy Configuration
    baseOccupancy: number;
    minOccupancy: number;
    maxOccupancy: number;

    // Pricing
    basePricePerNight: number;
    extraPersonCharge: number;

    // Amenities
    amenities: string[];
    bedConfiguration: string;
    hasSelfCooking: boolean;

    // Images
    images: {
        url: string;
        category: string;
        label?: string;
    }[];

    // Status
    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    calculatePrice(numberOfGuests: number): number;
    isAvailable(date: Date): Promise<boolean>;
}
