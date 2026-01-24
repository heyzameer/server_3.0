/**
 * Data Transfer Objects for Property operations
 */

export interface GetAllPropertiesQueryDto {
    page?: number;
    limit?: number;
    status?: 'pending' | 'verified' | 'rejected' | 'suspended';
    verificationStatus?: 'pending' | 'verified' | 'rejected' | 'suspended';
    propertyType?: 'hotel' | 'homestay' | 'apartment' | 'resort' | 'villa';
    city?: string;
    isActive?: boolean;
    isVerified?: boolean;
    search?: string; // Search by propertyName or city
}

export interface PropertyDetailsResponseDto {
    _id: string;
    propertyId: string;
    partnerId: string;
    propertyName: string;
    propertyType: string;
    description: string;
    amenities: string[];
    address: {
        street: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
    };
    location: {
        type: string;
        coordinates: [number, number];
    };
    images: string[];
    coverImage?: string;
    pricePerNight: number;
    maxGuests: number;
    totalRooms: number;
    availableRooms: number;
    isActive: boolean;
    isVerified: boolean;
    verificationStatus: string;
    onboardingCompleted: boolean;
    ownershipDocumentsCompleted: boolean;
    taxDocumentsCompleted: boolean;
    bankingDetailsCompleted: boolean;
    propertyDetailsCompleted: boolean;
    imagesUploaded: boolean;
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    canceledBookings: number;
    averageRating: number;
    totalReviews: number;
    ownershipDocuments: {
        ownershipProofStatus: string;
        ownerKYCStatus: string;
        rejectionReason?: string;
    };
    taxDocuments: {
        gstNumber?: string;
        panNumber?: string;
        taxStatus: string;
        rejectionReason?: string;
    };
    bankingDetails: {
        accountHolderName?: string;
        ifscCode?: string;
        upiId?: string;
        bankingStatus: string;
        rejectionReason?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface GetPropertiesResponseDto {
    properties: PropertyDetailsResponseDto[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
