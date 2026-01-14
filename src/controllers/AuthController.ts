import { Request, Response, NextFunction } from 'express';
import { OTPType } from '../types';
import { asyncHandler } from '../utils/errorHandler';
import { sendError, sendSuccess } from '../utils/response';
import { injectable, inject } from 'tsyringe';
import { IAuthService } from '../interfaces/IService/IAuthService';
import {
  RegisterRequestDto,
  LoginRequestDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  ChangePasswordDto,
  RequestOTPDto,
  ResendOTPDto,
  VerifyOTPDto,
  ValidateTokenDto
} from '../dtos/auth.dto';

@injectable()
/**
 * Controller for authentication-related operations.
 * Handles user registration, login, password management, and OTP verification.
 */
export class AuthController {

  constructor(
    @inject('AuthService') private authService: IAuthService
  ) { }

  /** 
   * Register a new user.
   * 
   * @param req - Express request object containing registration details in body.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends a success response with user tokens.
   */
  register = asyncHandler(async (req: Request<{}, {}, RegisterRequestDto>, res: Response, next: NextFunction) => {
    const { user, accessToken, refreshToken } = await this.authService.register(req.body);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    sendSuccess(res, 'User registered successfully', {
      user,
      accessToken,
      refreshToken
    }, 201);
  });


  /**
   * User login.
   * 
   * @param req - Express request object containing email and password.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends a success response with tokens.
   */
  login = asyncHandler(async (req: Request<{}, {}, LoginRequestDto>, res: Response, next: NextFunction) => {

    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await this.authService.login(email, password);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    sendSuccess(res, 'Login successful', {
      user,
      accessToken,
      refreshToken
    });
  });

  /**
   * Request password reset.
   * 
   * @param req - Express request object containing email.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends success message if OTP sent.
   */
  requestPasswordReset = asyncHandler(async (req: Request<{}, {}, RequestPasswordResetDto>, res: Response, next: NextFunction) => {
    const { email } = req.body;
    await this.authService.requestPasswordReset(email);

    sendSuccess(res, 'Password reset OTP sent to your email');
  });

  /**
   * Reset password using OTP.
   * 
   * @param req - Express request object containing email, OTP, and new password.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends success message.
   */
  resetPassword = asyncHandler(async (req: Request<{}, {}, ResetPasswordDto>, res: Response, next: NextFunction) => {
    const { email, otp, password } = req.body;
    await this.authService.resetPassword(email, otp, password);

    sendSuccess(res, 'Password reset successfully');
  });

  /**
   * Change user password.
   * 
   * @param req - Express request object containing current and new password.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends success message.
   */
  changePassword = asyncHandler(async (req: Request<{}, {}, ChangePasswordDto>, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    await this.authService.changePassword(userId, currentPassword, newPassword);

    sendSuccess(res, 'Password changed successfully');
  });

  /**
   * Request OTP for verification.
   * 
   * @param req - Express request object containing OTP type.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends success message.
   */
  requestOTP = asyncHandler(async (req: Request<{}, {}, RequestOTPDto>, res: Response, next: NextFunction) => {
    const { type } = req.body;
    const userId = req.user!.userId;

    // TODO: Validate if 'type' is a valid OTPType if not handled by Joi
    await this.authService.requestOTPVerification(userId, type);

    sendSuccess(res, `${type} OTP sent successfully`);
  });

  /**
   * Resend OTP.
   * 
   * @param req - Express request object.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends success message.
   */
  requestResendOTP = asyncHandler(async (req: Request<{}, {}, ResendOTPDto>, res: Response, next: NextFunction) => {
    const { type, email } = req.body;
    const userId = req.user!.userId;

    await this.authService.generateVerificationOTPs(userId, type as OTPType);

    sendSuccess(res, `${type} OTP resent successfully`);
  });


  /**
   * Verify OTP.
   * 
   * @param req - Express request object containing OTP code and type.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Sends success message.
   */
  verifyOTP = asyncHandler(async (req: Request<{}, {}, VerifyOTPDto>, res: Response, next: NextFunction) => {
    const { code, type } = req.body;
    const userId = req.user!.userId;

    await this.authService.verifyOTP(userId, type, code);

    sendSuccess(res, `${type} verified successfully`);
  });

  /**
   * Refresh access token.
   * 
   * @param req - Express request object (expects refreshToken in cookies).
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Returns new access token.
   */
  refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // TODO: Consider using a logger instead of console.log
    // console.log('Token Refreshing Called....');

    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      // console.log('No refresh token found!');
      return sendError(res, 'Refresh token required', 400);
    }

    const { accessToken: newAccessToken } = await this.authService.refreshToken(refreshToken);

    sendSuccess(res, 'Token refreshed successfully', { accessToken: newAccessToken });
  });

  /**
   * User logout.
   * 
   * @param req - Express request object.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Clears cookies and sends success message.
   */
  logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;
    await this.authService.logout(userId);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
      path: '/', // or same path used when setting
    });

    sendSuccess(res, 'Logout successful');
  });

  /**
   * Get user profile.
   * 
   * @param req - Express request object.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Returns user profile.
   */
  getProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return sendError(res, 'Token required', 400);
    }

    const user = await this.authService.getUserFromToken(token);

    sendSuccess(res, 'Profile retrieved successfully', { user });
  });


  /**
   * Validate token.
   * 
   * @param req - Express request object containing token.
   * @param res - Express response object.
   * @param next - Express next function.
   * @returns Promise<void> - Returns token validity.
   */
  validateToken = asyncHandler(async (req: Request<{}, {}, ValidateTokenDto>, res: Response, next: NextFunction) => {
    const { token } = req.body;

    const payload = await this.authService.validateToken(token);

    sendSuccess(res, 'Token is valid', { payload });
  });


  /**
   * Handle Google OAuth callback.
   * 
   * @param req - Express request object.
   * @param res - Express response object.
   * @param next - Express next function.
   */
  googleCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any; // User comes from passport middleware
      // Generate Tokens
      const accessToken = this.authService.generateAccessToken(user._id);
      const refreshToken = this.authService.generateRefreshToken(user._id);
      // Redirect to Frontend Callback Page with tokens
      // TODO: Move valid URL to config
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001/auth/google/callback';

      res.redirect(`${frontendUrl}?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${user._id}`);
    } catch (error) {
      next(error);
    }
  };
}
