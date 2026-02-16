import { Router } from 'express';
import { Request, Response } from 'express';
import authRoutes from './authRoutes';
import propertyRoutes from './propertyRoutes';
import PartnerRoutes from './partnerRoutes';
import userRoutes from '../routes/userRoutes';
import adminRoutes from './adminRoutes';
import { sendSuccess } from '../utils/response';

const router = Router();

// Health check route
router.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, 'Service is healthy', {
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version info
router.get('/version', (req: Request, res: Response) => {
  sendSuccess(res, 'API version information', {
    version: '1.0.0',
    apiVersion: 'v1',
    name: 'Property Management Platform API',
    description: 'Complete property management and booking platform API',
  });
});

import roomRoutes from './room.routes';
import { mealPlanRoutes } from './mealPlan.routes';
import { activityRoutes } from './activityRoutes';
import { packageRoutes } from './packageRoutes';
import bookingRoutes from './booking.routes';
import destinationRoutes from './destination.routes';
import uploadRoutes from './uploadRoutes';
import paymentRoutes from './paymentRoutes';
import reviewRoutes from './review.routes';

// Mount module routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/partner', PartnerRoutes);
router.use('/bookings', bookingRoutes);
router.use('/destinations', destinationRoutes);
router.use('/upload', uploadRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);

// Mount specific property sub-routes first to avoid conflicts
router.use('/properties/:propertyId/rooms', roomRoutes);
router.use('/rooms', roomRoutes);
router.use('/properties/:propertyId/meal-plans', mealPlanRoutes);
router.use('/properties/:propertyId/activities', activityRoutes);
router.use('/activities', activityRoutes);
router.use('/properties/:propertyId/packages', packageRoutes);
router.use('/packages', packageRoutes);

// Mount generic property routes last
router.use('/properties', propertyRoutes);
router.use('/admin', adminRoutes);

// 404 handler for API routes
router.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    timestamp: new Date(),
  });
});

export default router;