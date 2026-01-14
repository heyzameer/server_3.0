import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import { pagination } from '../middleware/pagination';
import { UserRole } from '../types';
import { container } from '../container/container';


import { idParamSchema } from '../validators/params';
import { addAddressSchema, getUsersSchema, updateAddressSchema, updateDeliveryPartnerInfoSchema, updateProfileSchema } from '../validators/user';
import { userUpload } from '../middleware/upload';

const router = Router();
const userController = container.resolve(UserController);

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userUpload, validate(updateProfileSchema), userController.updateProfile);

// // Address routes
// router.get('/addresses', userController.getAddresses);
// router.get('/addresses/:id', validateParams(idParamSchema), userController.getAddressById);
// router.post('/addresses', validate(addAddressSchema), userController.addAddress);
// router.put('/addresses/:id', validateParams(idParamSchema), validate(updateAddressSchema), userController.updateAddress);
// router.put('/addresses/:id/set-default', validateParams(idParamSchema), userController.setDefaultAddress);
// router.delete('/addresses/:id', validateParams(idParamSchema), userController.removeAddress);

// // Search routes
// router.get('/search', pagination, userController.searchUsers);


export default router;