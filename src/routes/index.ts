import { Router } from 'express';
import { Request, Response } from 'express';
import authRoutes from './authRoutes';
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
    name: 'Logistics Platform API',
    description: 'Complete logistics and delivery platform API',
  });
});

// Mount module routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/partner', PartnerRoutes);
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