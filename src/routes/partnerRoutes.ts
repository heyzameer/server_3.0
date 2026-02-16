import { Router } from 'express';
import { PartnerController } from '../controllers/PartnerController';
import { PropertyController } from '../controllers/PropertyController';
import { validate } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { container } from '../container/container';
import { registerPartnerSchema, partnerLoginOtpSchema, partnerVerifyOtpSchema } from '../validators/partner';
import { propertyRegistrationSchema } from '../validators/property';

import { authenticatePartner } from '../middleware/partnerAuth';
import { handleUploadError, partnerUpload } from '../middleware/upload';


const router = Router();
const partnerController = container.resolve(PartnerController);
const propertyController = container.resolve(PropertyController);
import { BookingController } from '../controllers/BookingController';
const bookingController = container.resolve(BookingController);

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

// Booking management
router.get('/bookings', bookingController.getPartnerBookings);
router.get('/bookings/:bookingId', bookingController.getPartnerBookingDetails);
router.patch('/bookings/:bookingId/approve', bookingController.approveBooking);
router.patch('/bookings/:bookingId/reject', bookingController.rejectBooking);
router.patch('/bookings/:bookingId/check-in', bookingController.checkIn);
router.patch('/bookings/:bookingId/check-out', bookingController.checkOut);
router.patch('/bookings/:bookingId/complete', bookingController.completeBooking);
router.patch('/bookings/:bookingId/refund', bookingController.processRefund);

export default router;