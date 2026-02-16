import { Document, Types } from 'mongoose';

export interface IReview extends Document {
    reviewId?: string;
    userId: Types.ObjectId;
    propertyId: Types.ObjectId;
    bookingId?: Types.ObjectId;

    // Rating breakdown
    overallRating: number;
    cleanlinessRating?: number;
    serviceRating?: number;
    valueForMoneyRating?: number;
    locationRating?: number;
    amenitiesRating?: number;

    // Review content
    title?: string;
    reviewText: string;

    // Review images
    images?: Array<{
        url: string;
        caption?: string;
    }>;

    // Verification
    isVerified: boolean;
    verifiedPurchase: boolean;

    // Helpful votes
    helpfulCount: number;
    notHelpfulCount: number;
    helpfulVotes?: Array<{
        userId: Types.ObjectId;
        isHelpful: boolean;
    }>;

    // Partner response
    partnerResponse?: {
        responseText: string;
        respondedAt: Date;
        respondedBy: Types.ObjectId;
    };

    // Moderation
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    moderationNotes?: string;

    // Metadata
    stayDate?: Date;
    tripType?: 'solo' | 'couple' | 'family' | 'friends' | 'business';

    // Flags
    isEdited: boolean;
    editedAt?: Date;
    isFlagged: boolean;
    flagReason?: string;

    createdAt: Date;
    updatedAt: Date;
}
