import { Router } from 'express';
import { PartnerController } from '../controllers/PartnerController';
import { PropertyController } from '../controllers/PropertyController';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { container } from '../container/container';
import { registerPartnerSchema, partnerAdharSchema, partnerLoginOtpSchema, partnerRegistrationSchema, partnerVerifyOtpSchema } from '../validators/partner';
import { propertyRegistrationSchema } from '../validators/property';

import { authenticatePartner } from '../middleware/partnerAuth';
import { handleUploadError, partnerUpload } from '../middleware/upload';


const router = Router();
const partnerController = container.resolve(PartnerController);
const propertyController = container.resolve(PropertyController);

// Public routes
router.post('/register-partner', authLimiter, validate(registerPartnerSchema), partnerController.registerPartner);
router.post('/request-login-otp', authLimiter, validate(partnerLoginOtpSchema), partnerController.requestLoginOtp);
// Resend OTP route (same behavior as request-login-otp)
router.post('/resend-login-otp', authLimiter, validate(partnerLoginOtpSchema), partnerController.requestLoginOtp);
router.post('/verify-login-otp', authLimiter, validate(partnerVerifyOtpSchema), partnerController.verifyLoginOtp);
router.post('/refresh-token', partnerController.refreshToken);

// Protected routes
router.use(authenticatePartner);
router.post('/register-prop', authLimiter, validate(propertyRegistrationSchema), propertyController.createProperty);
router.get('/profile', partnerController.getProfile);
router.get('/verification-status', partnerController.getVerificationStatus);
router.post('/logout', partnerController.logout);
router.post('/verify-adhar', authLimiter, partnerUpload, handleUploadError, partnerController.register);

// Image access routes (signed URLs)
router.get('/profile-picture', partnerController.getProfilePicture);
router.get('/aadhaar-documents', partnerController.getAadhaarDocuments);

export default router;