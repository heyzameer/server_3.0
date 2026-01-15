// src/controllers/PartnerController.ts
import { injectable, inject } from 'tsyringe';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { sendError, sendSuccess } from '../utils/response';
import { getS3FileUrl, processPartnerFiles } from '../middleware/upload';
import { IPartnerService } from '../interfaces/IService/IPartnerService';
import {
  RegisterPartnerReqDto,
  PartnerFullRegistrationDto,
  PartnerLoginOtpDto,
  PartnerVerifyOtpDto
} from '../dtos/partner.dto';

import { PartnerService } from '../services/PartnerService';
import { UserRole } from '../types';
import config from '../config';

/**
 * Controller for partner operations.
 * Manages partner registration, login (via OTP), and profile verification.
 */
@injectable()
export class PartnerController {
  constructor(
    @inject('PartnerService') private partnerService: IPartnerService
  ) { }

  /**
   * Quick registration for a partner (basic details).
   */
  registerPartner = asyncHandler(async (req: Request<any, any, RegisterPartnerReqDto>, res: Response, _next: NextFunction) => {
    const { user, accessToken, refreshToken } = await (this.partnerService as PartnerService).registerPartner({
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
      role: (req.body.role as UserRole) || UserRole.PARTNER
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
      maxAge: config.cookieExpiration ? parseInt(config.cookieExpiration.toString()) * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // Default to 7 days
    });

    sendSuccess(res, 'Partner registered successfully', {
      user,
      accessToken,
      refreshToken
    }, 201);
  });

  /**
   * Full registration for a partner (includes documents).
   */
  register = asyncHandler(async (req: Request<any, any, PartnerFullRegistrationDto>, res: Response, _next: NextFunction) => {
    const uploadedFiles = processPartnerFiles(req.files as { [fieldname: string]: Express.Multer.File[] });

    const fileUrls: { [key: string]: string } = {};
    uploadedFiles.forEach(file => {
      fileUrls[file.fieldname] = (file as any).location || getS3FileUrl((file as any).key);
    });

    const { partner, message, accessToken, refreshToken } = await this.partnerService.register(req.body, fileUrls);

    sendSuccess(res, message, {
      user: {
        id: partner._id.toString(),
        email: partner.email,
        fullName: partner.fullName,
        role: 'partner',
        isVerified: partner.isVerified
      },
      message,
      accessToken,
      refreshToken
    }, 201);
  });

  /**
   * Request a login OTP for a partner's email.
   */
  requestLoginOtp = asyncHandler(async (req: Request<any, any, PartnerLoginOtpDto>, res: Response, _next: NextFunction) => {
    const { email } = req.body;
    const result = await this.partnerService.requestLoginOtp(email);

    sendSuccess(res, result.message, result);
  });

  /**
   * Verify the login OTP and issue tokens.
   */
  verifyLoginOtp = asyncHandler(async (req: Request<any, any, PartnerVerifyOtpDto>, res: Response, _next: NextFunction) => {
    const { email, otp } = req.body;
    const { user, accessToken, refreshToken } = await this.partnerService.verifyLoginOtp(email, otp);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
      maxAge: config.cookieExpiration ? parseInt(config.cookieExpiration.toString()) * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // Default to 7 days
    });

    sendSuccess(res, 'Login successful', {
      user,
      accessToken,
      refreshToken
    });
  });

  /**
   * Get the current partner's profile.
   */
  getProfile = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const partnerId = req.user!.userId;
    const partner = await this.partnerService.getCurrentPartner(partnerId);

    sendSuccess(res, 'Profile retrieved successfully', { partner });
  });

  /**
   * Get the verification status of a partner's application.
   */
  getVerificationStatus = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const partnerId = req.user!.userId;
    const status = await this.partnerService.getVerificationStatus(partnerId);

    sendSuccess(res, 'Verification status retrieved successfully', status);
  });

  /**
   * Refresh the partner's access token using the refresh token from cookies.
   */
  refreshToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    const { accessToken: newAccessToken } = await this.partnerService.refreshToken(refreshToken);

    sendSuccess(res, 'Token refreshed successfully', { accessToken: newAccessToken });
  });

  /**
   * Logout the partner by clearing the refresh token cookie.
   */
  logout = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
      path: '/',
    });

    sendSuccess(res, 'Logout successful');
  });
}