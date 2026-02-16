import express from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { authenticate as authenticateUser } from '../middleware/auth';
import { authenticatePartner } from '../middleware/partnerAuth';

const router = express.Router();

// User routes
router.post('/', authenticateUser, ReviewController.createReview);
router.get('/user/my-reviews', authenticateUser, ReviewController.getUserReviews);
router.put('/:reviewId', authenticateUser, ReviewController.updateReview);
router.delete('/:reviewId', authenticateUser, ReviewController.deleteReview);
router.post('/:reviewId/vote', authenticateUser, ReviewController.voteReview);
router.post('/:reviewId/flag', authenticateUser, ReviewController.flagReview);

// Public routes
router.get('/property/:propertyId', ReviewController.getPropertyReviews);

// Partner routes
router.get('/partner/reviews', authenticatePartner, ReviewController.getPartnerPropertyReviews);
router.post('/:reviewId/partner-response', authenticatePartner, ReviewController.addPartnerResponse);

export default router;
