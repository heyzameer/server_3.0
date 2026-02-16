import express from 'express';
import { DestinationController } from '../controllers/DestinationController';

const router = express.Router();

// Public routes
router.get('/', DestinationController.getAllDestinations);
router.get('/trending', DestinationController.getTrendingDestinations);
router.get('/:slug', DestinationController.getDestinationBySlug);

export default router;
