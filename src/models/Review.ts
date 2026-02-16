import mongoose, { Schema } from 'mongoose';
import { IReview } from '../interfaces/IModel/IReview';

const reviewSchema = new Schema<IReview>({
    reviewId: {
        type: String,
        unique: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        index: true
    },

    // Rating breakdown
    overallRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    cleanlinessRating: {
        type: Number,
        min: 1,
        max: 5
    },
    serviceRating: {
        type: Number,
        min: 1,
        max: 5
    },
    valueForMoneyRating: {
        type: Number,
        min: 1,
        max: 5
    },
    locationRating: {
        type: Number,
        min: 1,
        max: 5
    },
    amenitiesRating: {
        type: Number,
        min: 1,
        max: 5
    },

    // Review content
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    reviewText: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 2000
    },

    // Review images
    images: [{
        url: { type: String, required: true },
        caption: { type: String }
    }],

    // Verification
    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    verifiedPurchase: {
        type: Boolean,
        default: false
    },

    // Helpful votes
    helpfulCount: {
        type: Number,
        default: 0
    },
    notHelpfulCount: {
        type: Number,
        default: 0
    },
    helpfulVotes: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        isHelpful: { type: Boolean }
    }],

    // Partner response
    partnerResponse: {
        responseText: { type: String, trim: true },
        respondedAt: { type: Date },
        respondedBy: { type: Schema.Types.ObjectId, ref: 'Partner' }
    },

    // Moderation
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'approved',
        index: true
    },
    moderationNotes: { type: String },

    // Metadata
    stayDate: { type: Date },
    tripType: {
        type: String,
        enum: ['solo', 'couple', 'family', 'friends', 'business'],
    },

    // Flags
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String }

}, {
    timestamps: true
});

// Compound indexes
reviewSchema.index({ propertyId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, propertyId: 1 }, { unique: true }); // One review per user per property
reviewSchema.index({ isVerified: 1, status: 1 });

// Generate unique review ID
reviewSchema.pre('save', async function (next) {
    if (!this.reviewId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        this.reviewId = `REV${year}${month}${random}`;
    }
    next();
});

// Update property average rating after review save
reviewSchema.post('save', async function () {
    const Property = mongoose.model('Property');
    const Review = mongoose.model('Review');

    const stats = await Review.aggregate([
        {
            $match: {
                propertyId: this.propertyId,
                status: 'approved'
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$overallRating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await Property.findByIdAndUpdate(this.propertyId, {
            averageRating: Math.round(stats[0].averageRating * 10) / 10,
            totalReviews: stats[0].totalReviews
        });
    }
});

// Update property average rating after review delete
reviewSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        const Property = mongoose.model('Property');
        const Review = mongoose.model('Review');

        const stats = await Review.aggregate([
            {
                $match: {
                    propertyId: doc.propertyId,
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$overallRating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            await Property.findByIdAndUpdate(doc.propertyId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalReviews: stats[0].totalReviews
            });
        } else {
            await Property.findByIdAndUpdate(doc.propertyId, {
                averageRating: 0,
                totalReviews: 0
            });
        }
    }
});

export const Review = mongoose.model<IReview>('Review', reviewSchema);
