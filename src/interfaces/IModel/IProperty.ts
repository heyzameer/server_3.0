import { Document, Types } from 'mongoose';

export interface IProperty extends Document {
    propertyId: string;
    partnerId: Types.ObjectId;
    destinationId?: Types.ObjectId;
    propertyName: string;
    propertyType: 'hotel' | 'homestay' | 'apartment' | 'resort' | 'villa';
    description: string;
    amenities: string[];

    // Location
    address: {
        street: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
    };
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };

    // Documents
    ownershipDocuments: {
        ownershipProof?: string;
        ownershipProofStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
        ownerKYC?: string;
        ownerKYCStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
        rejectionReason?: string;
    };

    taxDocuments: {
        gstNumber?: string;
        gstCertificate?: string;
        panNumber?: string;
        panCard?: string;
        taxStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
        rejectionReason?: string;
    };

    bankingDetails: {
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
        upiId?: string;
        bankingStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
        rejectionReason?: string;
    };

    // Media
    images: Array<{
        url: string;
        category: 'Facade' | 'Entrance' | 'Living Room' | 'Bedroom' | 'Bathroom' | 'Kitchen' | 'Dining' | 'Terrace' | 'Parking' | 'Pool' | 'Washroom' | 'Others';
        label?: string;
    }>;
    coverImage?: string;

    // Pricing & Capacity (Moved to Room Model, but injected for response)
    basePrice?: number; // Injected field
    pricePerNight?: number; // Legacy/Frontend compatibility
    mealPlans?: any[]; // Injected field
    activities?: any[]; // Injected field
    // maxGuests: number;
    // totalRooms: number;
    // availableRooms: number;

    // Status
    isActive: boolean;
    isVerified: boolean;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended';
    overallRejectionReason?: string; // Rejection reason for entire property
    onboardingCompleted: boolean;

    // Completion Flags
    ownershipDocumentsCompleted: boolean;
    taxDocumentsCompleted: boolean;
    bankingDetailsCompleted: boolean;
    propertyDetailsCompleted: boolean;
    imagesUploaded: boolean;

    // Stats
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    canceledBookings: number;

    // Ratings
    averageRating: number;
    totalReviews: number;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    verifiedAt?: Date; // When property was verified
    submittedForVerificationAt?: Date; // When property was submitted for verification


    // Methods
    isOnboardingComplete(): boolean;
    getOnboardingProgress(): number;
    getNextOnboardingStep(): string;
}
