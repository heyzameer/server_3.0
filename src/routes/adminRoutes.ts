import { Router } from 'express';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { container } from '../container/container';

import { AdminController } from '../controllers/AdminController';
import { loginSchema } from '../validators/auth';
import { getPropertiesQuerySchema } from '../validators/property';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();
const adminController = container.resolve(AdminController);
// Public routes
router.post('/login', authLimiter, validate(loginSchema), adminController.adminLogin);

// // Protected routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUserStatus);

router.get('/partners', adminController.getAllPartners);
router.get('/partners/requests', adminController.getAllPartnersRequest); // Specific route BEFORE generic :id route
router.get('/partners/:id', adminController.getPartnerDetails);
router.get('/partners/:id/verification-details', adminController.getPartnerDetails); // Mapping to getPartnerDetails for full object
router.put('/partners/:id', adminController.updatePartnerStatus);
router.patch('/partners/:id/verify', adminController.updatePartnerDocumentStatus);
router.post('/partners/send-email', adminController.sendPartnerEmail);

router.get('/properties', adminController.getAllProperties);
router.get('/properties/applications', adminController.getAllPropertyApplications); // Specific route BEFORE generic :id route
router.get('/properties/:id', adminController.getPropertyById);
router.put('/properties/:id', adminController.updateProperty);
router.get('/properties/:id/verification-details', adminController.getPropertyVerificationDetails);
router.patch('/properties/:id/document-status', adminController.updatePropertyDocumentStatus);
router.patch('/properties/:id/verify', adminController.verifyProperty);


// router.get('/', authorize([UserRole.ADMIN]), pagination, validateQuery(getUsersSchema), userController.getAllUsers);
// router.get('/stats', authorize([UserRole.ADMIN]), userController.getUserStats);
// router.get('/:id', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.getUserById);
// router.put('/:id/activate', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.activateUser);
// router.put('/:id/deactivate', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.deactivateUser);
// router.put('/:id/verify-documents', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.verifyDeliveryPartnerDocuments);

export default router;