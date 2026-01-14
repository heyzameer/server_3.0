import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate, validateParams } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimit';
import { container } from '../container/container';
import passport from 'passport';

import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyOTPSchema,
  requestOTPSchema,
  resendOTPSchema,
} from '../validators/auth';

const router = Router();
const authController = container.resolve(AuthController);

import '../config/passport'; // Import passport config to register strategy
// ... existing routes ...
// 1. Initiate Google Login
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
// 2. Handle Google Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login-failed' }),
  authController.googleCallback
);

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.requestPasswordReset);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/validate-token', authController.validateToken);


// Protected routes
router.use(authenticate);
router.get('/profile', authController.getProfile);
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);
router.post('/request-otp', otpLimiter, validate(requestOTPSchema), authController.requestOTP);
router.post('/resend-otp', otpLimiter, validate(resendOTPSchema), authController.requestResendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), authController.verifyOTP);
router.post('/logout', authController.logout);




export default router;
