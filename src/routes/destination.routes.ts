import express from 'express';
import { DestinationController } from '../controllers/DestinationController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

// Public routes
router.get('/', DestinationController.getAllDestinations);
router.get('/trending', DestinationController.getTrendingDestinations);
router.get('/search', DestinationController.searchDestinations);
router.get('/id/:id', DestinationController.getDestinationById);
router.get('/:slug', DestinationController.getDestinationBySlug);

// Admin routes (protected)
router.get('/admin/all', authenticate, authorize([UserRole.ADMIN]), DestinationController.getAdminDestinations);
router.post('/', authenticate, authorize([UserRole.ADMIN]), DestinationController.createDestination);
router.patch('/:id', authenticate, authorize([UserRole.ADMIN]), DestinationController.updateDestination);
router.delete('/:id', authenticate, authorize([UserRole.ADMIN]), DestinationController.deleteDestination);

// Place management routes (admin protected)
router.post('/:id/places', authenticate, authorize([UserRole.ADMIN]), DestinationController.addPlaceToVisit);
router.patch('/:id/places/:placeId', authenticate, authorize([UserRole.ADMIN]), DestinationController.updatePlaceToVisit);
router.delete('/:id/places/:placeId', authenticate, authorize([UserRole.ADMIN]), DestinationController.removePlaceToVisit);

export default router;
