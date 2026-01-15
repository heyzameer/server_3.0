import { Router } from 'express';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { container } from '../container/container';

import { AdminController } from '../controllers/AdminController';
// import { UserController } from '../controllers/UserController';
import { loginSchema } from '../validators/auth';
// import { authenticateAdmin } from '../middleware/authenticateAdmin';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
// import { pagination } from '../middleware/pagination';
// import { getUsersSchema } from '../validators/user';

const router = Router();
const adminController = container.resolve(AdminController);
// const userController = container.resolve(UserController);
// import { validateParams } from '../middleware/validation';
// import { idParamSchema } from '../validators/params';
// Public routes
router.post('/login', authLimiter, validate(loginSchema), adminController.adminLogin);

// // Protected routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUserStatus);

router.get('/partners', adminController.getAllPartners);
router.get('/partners/:id', adminController.getPartnerDetails);
router.put('/partners/:id', adminController.updatePartnerStatus);
router.post('/partners/send-email', adminController.sendPartnerEmail);

// router.get('/partners/requests',adminController.getAllPartnersRequest);
// router.get('/', authorize([UserRole.ADMIN]), pagination, validateQuery(getUsersSchema), userController.getAllUsers);
// router.get('/stats', authorize([UserRole.ADMIN]), userController.getUserStats);
// router.get('/:id', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.getUserById);
// router.put('/:id/activate', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.activateUser);
// router.put('/:id/deactivate', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.deactivateUser);
// router.put('/:id/verify-documents', authorize([UserRole.ADMIN]), validateParams(idParamSchema), userController.verifyDeliveryPartnerDocuments);

export default router;