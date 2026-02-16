import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { Booking } from '../models/Booking';
import { Property } from '../models/Property';
import logger from '../utils/logger';
import mongoose from 'mongoose';

export class ReviewController {
    // Create a new review
    static async createReview(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const {
                propertyId,
                bookingId,
                overallRating,
                cleanlinessRating,
                serviceRating,
                valueForMoneyRating,
                locationRating,
                amenitiesRating,
                title,
                reviewText,
                images,
                stayDate,
                tripType
            } = req.body;

            logger.info('Creating review:', { userId, propertyId, overallRating, reviewTextLen: reviewText?.length });

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Check if user has already reviewed this property
            const existingReview = await Review.findOne({ userId, propertyId });
            if (existingReview) {
                logger.warn('User already reviewed this property:', { userId, propertyId, reviewId: existingReview.reviewId });
                return res.status(400).json({
                    message: 'You have already reviewed this property',
                    data: existingReview
                });
            }

            // Check if property exists
            const property = await Property.findById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }

            // Check verification status (Completed/Checked-out OR Confirmed+Past Date)
            let isVerified = false;
            let verifiedPurchase = false;
            let finalBookingId = bookingId && mongoose.isValidObjectId(bookingId) ? bookingId : undefined;

            const verifyConditions = {
                userId,
                propertyId,
                status: { $in: ['completed', 'checked_out', 'checked_in', 'confirmed'] }
            };

            let verifiedBooking = null;
            if (finalBookingId) {
                verifiedBooking = await Booking.findOne({
                    _id: finalBookingId,
                    ...verifyConditions
                });
            }

            if (!verifiedBooking) {
                verifiedBooking = await Booking.findOne(verifyConditions).sort({ checkOutDate: -1 });
            }

            if (verifiedBooking) {
                isVerified = true;
                verifiedPurchase = true;
                finalBookingId = verifiedBooking._id;
            }

            const review = new Review({
                userId,
                propertyId,
                bookingId: finalBookingId,
                overallRating,
                cleanlinessRating,
                serviceRating,
                valueForMoneyRating,
                locationRating,
                amenitiesRating,
                title,
                reviewText,
                images: images || [],
                isVerified,
                verifiedPurchase,
                stayDate: stayDate || undefined,
                tripType: tripType || undefined,
                status: 'approved' // Auto-approve for now, can add moderation later
            });

            await review.save();

            const populatedReview = await Review.findById(review._id)
                .populate('userId', 'fullName profilePicture')
                .populate('propertyId', 'propertyName coverImage');

            logger.info(`Review created: ${review.reviewId} by user ${userId}`);

            res.status(201).json({
                message: 'Review submitted successfully',
                data: populatedReview
            });
        } catch (error: any) {
            logger.error('Error creating review:', error);
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    message: 'Validation Error',
                    error: error.message
                });
            }
            res.status(500).json({
                message: 'Failed to create review',
                error: error.message || 'Unknown error'
            });
        }
    }

    // Get reviews for a property
    static async getPropertyReviews(req: Request, res: Response) {
        try {
            const { propertyId } = req.params;
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                order = 'desc',
                minRating,
                verifiedOnly,
                withImages
            } = req.query;

            const query: any = {
                propertyId,
                status: 'approved'
            };

            if (minRating) {
                query.overallRating = { $gte: Number(minRating) };
            }

            if (verifiedOnly === 'true') {
                query.isVerified = true;
            }

            if (withImages === 'true') {
                query['images.0'] = { $exists: true };
            }

            const skip = (Number(page) - 1) * Number(limit);
            const sortOrder = order === 'desc' ? -1 : 1;

            const reviews = await Review.find(query)
                .populate('userId', 'fullName profilePicture')
                .sort({ [sortBy as string]: sortOrder })
                .skip(skip)
                .limit(Number(limit));

            const total = await Review.countDocuments(query);

            // Get rating distribution
            const ratingDistribution = await Review.aggregate([
                {
                    $match: {
                        propertyId: new mongoose.Types.ObjectId(propertyId),
                        status: 'approved'
                    }
                },
                {
                    $group: {
                        _id: '$overallRating',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: -1 } }
            ]);

            // Get average ratings breakdown
            const avgRatings = await Review.aggregate([
                {
                    $match: {
                        propertyId: new mongoose.Types.ObjectId(propertyId),
                        status: 'approved'
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgOverall: { $avg: '$overallRating' },
                        avgCleanliness: { $avg: '$cleanlinessRating' },
                        avgService: { $avg: '$serviceRating' },
                        avgValue: { $avg: '$valueForMoneyRating' },
                        avgLocation: { $avg: '$locationRating' },
                        avgAmenities: { $avg: '$amenitiesRating' }
                    }
                }
            ]);

            res.status(200).json({
                message: 'Reviews fetched successfully',
                data: {
                    reviews,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / Number(limit))
                    },
                    ratingDistribution,
                    averageRatings: avgRatings[0] || {}
                }
            });
        } catch (error) {
            logger.error('Error fetching property reviews:', error);
            res.status(500).json({ message: 'Failed to fetch reviews', error });
        }
    }

    // Get user's reviews
    static async getUserReviews(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const { page = 1, limit = 10 } = req.query;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const skip = (Number(page) - 1) * Number(limit);

            const reviews = await Review.find({ userId })
                .populate('propertyId', 'propertyName coverImage address')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));

            const total = await Review.countDocuments({ userId });

            res.status(200).json({
                message: 'User reviews fetched successfully',
                data: {
                    reviews,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / Number(limit))
                    }
                }
            });
        } catch (error) {
            logger.error('Error fetching user reviews:', error);
            res.status(500).json({ message: 'Failed to fetch user reviews', error });
        }
    }

    // Update a review
    static async updateReview(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const { reviewId } = req.params;
            const updates = req.body;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const review = await Review.findOne({ _id: reviewId, userId });
            if (!review) {
                return res.status(404).json({ message: 'Review not found or unauthorized' });
            }

            // Update allowed fields
            const allowedUpdates = [
                'overallRating', 'cleanlinessRating', 'serviceRating',
                'valueForMoneyRating', 'locationRating', 'amenitiesRating',
                'title', 'reviewText', 'images', 'tripType'
            ];

            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    (review as any)[field] = updates[field];
                }
            });

            review.isEdited = true;
            review.editedAt = new Date();

            await review.save();

            const updatedReview = await Review.findById(review._id)
                .populate('userId', 'fullName profilePicture')
                .populate('propertyId', 'propertyName coverImage');

            logger.info(`Review updated: ${review.reviewId}`);

            res.status(200).json({
                message: 'Review updated successfully',
                data: updatedReview
            });
        } catch (error) {
            logger.error('Error updating review:', error);
            res.status(500).json({ message: 'Failed to update review', error });
        }
    }

    // Delete a review
    static async deleteReview(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const { reviewId } = req.params;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const review = await Review.findOneAndDelete({ _id: reviewId, userId });
            if (!review) {
                return res.status(404).json({ message: 'Review not found or unauthorized' });
            }

            // logger.info(`Review deleted: ${review._id?.toString() || 'unknown'}`);

            res.status(200).json({ message: 'Review deleted successfully' });
        } catch (error) {
            logger.error('Error deleting review:', error);
            res.status(500).json({ message: 'Failed to delete review', error });
        }
    }

    // Mark review as helpful/not helpful
    static async voteReview(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const { reviewId } = req.params;
            const { isHelpful } = req.body;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const review = await Review.findById(reviewId);
            if (!review) {
                return res.status(404).json({ message: 'Review not found' });
            }

            // Remove existing vote if any
            review.helpfulVotes = review.helpfulVotes?.filter(
                vote => vote.userId.toString() !== userId
            ) || [];

            // Add new vote
            review.helpfulVotes.push({ userId: new mongoose.Types.ObjectId(userId), isHelpful });

            // Update counts
            review.helpfulCount = review.helpfulVotes.filter(v => v.isHelpful).length;
            review.notHelpfulCount = review.helpfulVotes.filter(v => !v.isHelpful).length;

            await review.save();

            res.status(200).json({
                message: 'Vote recorded successfully',
                data: {
                    helpfulCount: review.helpfulCount,
                    notHelpfulCount: review.notHelpfulCount
                }
            });
        } catch (error) {
            logger.error('Error voting on review:', error);
            res.status(500).json({ message: 'Failed to vote on review', error });
        }
    }

    // Partner: Add response to review
    static async addPartnerResponse(req: Request, res: Response) {
        try {
            const partnerId = req.user?.userId;
            const { reviewId } = req.params;
            const { responseText } = req.body;

            if (!partnerId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const review = await Review.findById(reviewId).populate('propertyId');
            if (!review) {
                return res.status(404).json({ message: 'Review not found' });
            }

            // Verify partner owns the property
            const property = await Property.findOne({ _id: review.propertyId, partnerId });
            if (!property) {
                return res.status(403).json({ message: 'Unauthorized to respond to this review' });
            }

            review.partnerResponse = {
                responseText,
                respondedAt: new Date(),
                respondedBy: new mongoose.Types.ObjectId(partnerId)
            };

            await review.save();

            logger.info(`Partner response added to review: ${review.reviewId}`);

            res.status(200).json({
                message: 'Response added successfully',
                data: review
            });
        } catch (error) {
            logger.error('Error adding partner response:', error);
            res.status(500).json({ message: 'Failed to add response', error });
        }
    }

    // Partner: Get reviews for their properties
    static async getPartnerPropertyReviews(req: Request, res: Response) {
        try {
            const partnerId = req.user?.userId;
            const { page = 1, limit = 10, propertyId } = req.query;

            if (!partnerId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Get partner's properties
            const properties = await Property.find({ partnerId }).select('_id');
            const propertyIds = properties.map(p => p._id);

            const query: any = {
                propertyId: { $in: propertyIds },
                status: 'approved'
            };

            if (propertyId) {
                query.propertyId = propertyId;
            }

            const skip = (Number(page) - 1) * Number(limit);

            const reviews = await Review.find(query)
                .populate('userId', 'fullName profilePicture')
                .populate('propertyId', 'propertyName coverImage')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit));

            const total = await Review.countDocuments(query);

            // Get stats
            const stats = await Review.aggregate([
                { $match: { propertyId: { $in: propertyIds }, status: 'approved' } },
                {
                    $group: {
                        _id: null,
                        avgRating: { $avg: '$overallRating' },
                        totalReviews: { $sum: 1 },
                        verifiedReviews: {
                            $sum: { $cond: ['$isVerified', 1, 0] }
                        },
                        needsResponse: {
                            $sum: { $cond: [{ $eq: ['$partnerResponse', null] }, 1, 0] }
                        }
                    }
                }
            ]);

            res.status(200).json({
                message: 'Partner reviews fetched successfully',
                data: {
                    reviews,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / Number(limit))
                    },
                    stats: stats[0] || {
                        avgRating: 0,
                        totalReviews: 0,
                        verifiedReviews: 0,
                        needsResponse: 0
                    }
                }
            });
        } catch (error) {
            logger.error('Error fetching partner reviews:', error);
            res.status(500).json({ message: 'Failed to fetch partner reviews', error });
        }
    }

    // Flag a review
    static async flagReview(req: Request, res: Response) {
        try {
            const { reviewId } = req.params;
            const { reason } = req.body;

            const review = await Review.findById(reviewId);
            if (!review) {
                return res.status(404).json({ message: 'Review not found' });
            }

            review.isFlagged = true;
            review.flagReason = reason;
            review.status = 'flagged';

            await review.save();

            logger.info(`Review flagged: ${review.reviewId}`);

            res.status(200).json({ message: 'Review flagged for moderation' });
        } catch (error) {
            logger.error('Error flagging review:', error);
            res.status(500).json({ message: 'Failed to flag review', error });
        }
    }
}
