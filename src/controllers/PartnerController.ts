// src/controllers/PartnerController.ts
import { injectable, inject } from 'tsyringe';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { sendError, sendSuccess } from '../utils/response';
import { getS3FileUrl } from '../middleware/upload';
import { IPartnerService } from '../interfaces/IService/IPartnerService';
import {
  RegisterPartnerReqDto,
  PartnerLoginOtpDto,
  PartnerVerifyOtpDto
} from '../dtos/partner.dto';

import { BasicPartnerRegistrationData } from '../types';
import config from '../config';
import { logger } from '../utils/logger';
import { ResponseMessages } from '../enums/ResponseMessages';
import { HttpStatus } from '../enums/HttpStatus';

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
   * Register a partner (TravelHub Property Owner) with basic info.
   */
  registerPartner = asyncHandler(async (req: Request<any, any, BasicPartnerRegistrationData>, res: Response, _next: NextFunction) => {
    const { partner, message, accessToken, refreshToken } = await this.partnerService.registerPartner(req.body);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
      maxAge: config.cookieExpiration ? parseInt(config.cookieExpiration.toString()) * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, message, {
      user: {
        id: partner._id.toString(),
        email: partner.email,
        fullName: partner.fullName,
        partnerId: partner.partnerId,
        role: 'partner',
        isVerified: partner.isVerified,
        aadhaarVerified: partner.aadhaarVerified,
        profilePicture: partner.profilePicture
      },
      accessToken,
      refreshToken
    }, HttpStatus.CREATED);
  });

  /**
   * Handle Aadhaar verification (upload Aadhaar images).
   * Protected route - uses partnerId from auth token.
   */
  register = asyncHandler(async (req: Request<any, any, any>, res: Response, _next: NextFunction) => {
    // Get partnerId from auth middleware
    if (!req.partner?.partnerId) {
      return sendError(res, ResponseMessages.AUTH_TOKEN_REQUIRED, HttpStatus.UNAUTHORIZED);
    }

    const partnerId = req.partner.partnerId;

    // Block submissions for deactivated partners
    if (!(req.partner as any).isActive) {
      return sendError(res, ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.FORBIDDEN);
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];

    const fileUrls: { [key: string]: string } = {};

    // Extract file URLs from Multer S3 upload
    if (files) {
      if (Array.isArray(files)) {
        files.forEach(file => {
          fileUrls[file.fieldname] = (file as any).location || getS3FileUrl((file as any).key);
        });
      } else {
        Object.keys(files).forEach(fieldname => {
          const fileArray = files[fieldname];
          if (fileArray && fileArray.length > 0) {
            const file = fileArray[0];
            fileUrls[file.fieldname] = (file as any).location || getS3FileUrl((file as any).key);
          }
        });
      }
    }

    // Log S3 upload results
    logger.info(`📤 S3 Upload Results for partner ${partnerId}:`);
    logger.info(`  - profilePicture: ${fileUrls.profilePicture ? '✅' : '❌'}`);
    logger.info(`  - aadharFront: ${fileUrls.aadharFront ? '✅' : '❌'}`);
    logger.info(`  - aadharBack: ${fileUrls.aadharBack ? '✅' : '❌'}`);

    // Validate S3 upload succeeded
    if (Object.keys(fileUrls).length === 0) {
      logger.error('❌ S3 upload failed - no files uploaded');
      return sendError(res, ResponseMessages.FILE_UPLOAD_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { dateOfBirth } = req.body;

    try {
      const { partner, message, accessToken, refreshToken } = await this.partnerService.verifyAadhar(
        partnerId,
        fileUrls,
        dateOfBirth
      );

      const processedPartner = await this.partnerService.injectSignedUrls(partner);
      const finalPartner = this.partnerService.injectDecryptedDetails(processedPartner);

      // Set refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
        maxAge: config.cookieExpiration ? parseInt(config.cookieExpiration.toString()) * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, message, {
        user: {
          ...finalPartner,
          id: finalPartner._id.toString(),
          role: 'partner',
        },
        accessToken,
        refreshToken
      }, HttpStatus.OK);
    } catch (error: any) {
      logger.error('❌ Aadhaar verification failed:', error);
      return sendError(res, error.message || ResponseMessages.DOCUMENTS_VERIFY_FAILED, error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  });

  /**
   * Request a login OTP for a partner's email.
   */
  requestLoginOtp = asyncHandler(async (req: Request<any, any, PartnerLoginOtpDto>, res: Response, _next: NextFunction) => {
    const { email } = req.body;
    const result = await this.partnerService.requestLoginOtp(email);

    sendSuccess(res, ResponseMessages.OTP_SENT, result);
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

    sendSuccess(res, ResponseMessages.LOGIN_SUCCESS, {
      user,
      accessToken,
      refreshToken
    });
  });

  /**
   * Get the current partner's profile.
   */
  /**
   * Get the current partner's profile.
   */
  getProfile = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const partnerId = req.partner?.partnerId || req.user?.userId;
    if (!partnerId) {
      return sendError(res, ResponseMessages.AUTH_TOKEN_REQUIRED, HttpStatus.UNAUTHORIZED);
    }

    const partner = await this.partnerService.getCurrentPartner(partnerId);

    const processedPartner = await this.partnerService.injectSignedUrls(partner);
    const finalPartner = this.partnerService.injectDecryptedDetails(processedPartner);

    sendSuccess(res, ResponseMessages.PROFILE_RETRIEVED, finalPartner);
  });

  /**
   * Get the verification status of a partner's application.
   */
  getVerificationStatus = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const partnerId = req.user!.userId;
    const status = await this.partnerService.getVerificationStatus(partnerId);

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, status);
  });

  /**
   * Refresh the partner's access token using the refresh token from cookies.
   */
  refreshToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return sendError(res, ResponseMessages.INVALID_TOKEN, HttpStatus.BAD_REQUEST);
    }

    const { accessToken: newAccessToken } = await this.partnerService.refreshToken(refreshToken);

    sendSuccess(res, ResponseMessages.TOKEN_REFRESHED, { accessToken: newAccessToken });
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

    sendSuccess(res, ResponseMessages.LOGOUT_SUCCESS);
  });

  /**
   * Get signed URL for profile picture
   * GET /api/v1/partner/profile-picture
   */
  getProfilePicture = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.partner?.partnerId) {
      return sendError(res, ResponseMessages.AUTH_TOKEN_REQUIRED, HttpStatus.UNAUTHORIZED);
    }

    const signedUrl = await this.partnerService.getProfilePictureUrl(req.partner.partnerId);

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, {
      url: signedUrl,
      expiresIn: config.signedUrlExpiration
    });
  });

  /**
   * Get signed URLs for Aadhaar documents
   * GET /api/v1/partner/aadhaar-documents
   */
  getAadhaarDocuments = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.partner?.partnerId) {
      return sendError(res, ResponseMessages.AUTH_TOKEN_REQUIRED, HttpStatus.UNAUTHORIZED);
    }

    const urls = await this.partnerService.getAadhaarDocumentUrls(req.partner.partnerId);

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, {
      ...urls,
      expiresIn: config.signedUrlExpiration
    });
  });
}
