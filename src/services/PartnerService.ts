import { injectable, inject } from 'tsyringe';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { createError } from '../utils/errorHandler';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';
import { generateOTP } from '../utils/helpers';
import { BasicPartnerRegistrationData, JWTPayload, OTPType, PaginatedResult, PaginationOptions, UserRole } from '../types';
import config from '../config';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { IPartner } from '../interfaces/IModel/IPartner';
import { IEmailService } from '../interfaces/IService/IEmailService';
import { IPartnerService } from '../interfaces/IService/IPartnerService';
import { IOCRService } from '../interfaces/IService/IOCRService';
import { HttpStatus } from '../enums/HttpStatus';
import { encrypt, decrypt } from '../utils/encryption';
import { ResponseMessages } from '../enums/ResponseMessages';
import { SocketService } from './SocketService';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';

/**
 * Service for handling partner-related operations.
 * Implements registration, verification, and profile management for partners.
 */
@injectable()
export class PartnerService implements IPartnerService {
  private s3Client: S3Client;
  private socketService?: SocketService;

  constructor(
    @inject('PartnerRepository') private partnerRepository: IPartnerRepository,
    @inject('OTPRepository') private otpRepository: IOTPRepository,
    @inject('EmailService') private emailService: IEmailService,
    @inject(config.useGeminiOCR ? 'GeminiOCRService' : 'OCRService') private ocrService: IOCRService,
    @inject('PropertyRepository') private propertyRepository: IPropertyRepository
  ) {
    // Initialize S3 client for signed URLs
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });

    // Log which OCR service is being used
    logger.info(`🔧 OCR Service: ${config.useGeminiOCR ? 'Gemini AI' : 'Tesseract'} `);
  }

  /**
   * Set the socket service instance (called after initialization)
   */
  public setSocketService(socketService: SocketService): void {
    this.socketService = socketService;
  }

  /**
   * Register a partner with basic information only.
   * Aadhaar verification happens in a separate step.
   */
  async registerPartner(
    registrationData: BasicPartnerRegistrationData
  ): Promise<{ partner: IPartner; message: string; accessToken: string; refreshToken: string }> {
    try {
      const existingPartner = await this.partnerRepository.findByEmailOrMobile(
        registrationData.email,
        registrationData.phone
      );

      if (existingPartner) {
        if (existingPartner.email === registrationData.email.toLowerCase()) {
          throw createError(ResponseMessages.EMAIL_ALREADY_REGISTERED, HttpStatus.BAD_REQUEST);
        }
        if (existingPartner.phone === registrationData.phone) {
          throw createError(ResponseMessages.MOBILE_ALREADY_REGISTERED, HttpStatus.BAD_REQUEST);
        }
      }

      const partnerId = await this.generatePartnerId();

      const partner = await this.partnerRepository.create({
        ...registrationData,
        partnerId,
        isActive: true,
        status: 'pending' // Still pending verification but active account
      });

      const accessToken = this.generateAccessToken(partner);
      const refreshToken = this.generateRefreshToken(partner);

      logger.info(`Partner registered successfully: ${partner.email} `);

      return {
        partner,
        message: 'Registration successful! Please complete Aadhaar verification to add properties.',
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('Partner registration failed:', error);
      throw error;
    }
  }

  /**
   * Handle Aadhaar verification for an existing partner.
   */
  async verifyAadhar(
    partnerId: string,
    fileUrls: { [key: string]: string },
    dateOfBirth?: string
  ): Promise<{ partner: IPartner; message: string; accessToken: string; refreshToken: string }> {
    try {
      const partner = await this.partnerRepository.findById(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      // 0. Merge provided files with existing ones (Fallback mechanism)
      const finalFileUrls = {
        profilePicture: fileUrls.profilePicture || partner.profilePicture,
        aadharFront: fileUrls.aadharFront || partner.personalDocuments?.aadharFront,
        aadharBack: fileUrls.aadharBack || partner.personalDocuments?.aadharBack
      };

      // Validate all required files are present (either new or existing)
      const requiredFiles = ['profilePicture', 'aadharFront', 'aadharBack'] as const;
      const missingFiles = requiredFiles.filter(field => !finalFileUrls[field]);

      if (missingFiles.length > 0) {
        throw createError(
          `Missing required files: ${missingFiles.join(', ')}. Please upload all required documents.`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate S3 URLs are properly formatted (only for newly uploaded ones)
      for (const [field, url] of Object.entries(fileUrls)) {
        if (url && (!url.startsWith('https://') || !url.includes('s3'))) {
          logger.error(`Invalid S3 URL for ${field}: ${url} `);
          throw createError(
            `Invalid file URL for ${field}.Upload may have failed.`,
            HttpStatus.BAD_REQUEST
          );
        }
      }

      logger.info(`✅ All files validated for partner: ${partnerId} `);
      logger.debug(`Final merged File URLs: ${JSON.stringify(finalFileUrls, null, 2)} `);

      // 1. Trigger OCR extraction
      let aadharExtractedData = null;
      let ocrError = null;

      try {
        logger.info(`🔍 Extracting Aadhaar data for partner: ${partner.email} `);
        aadharExtractedData = await this.ocrService.extractAadharData(
          finalFileUrls.aadharFront!,
          finalFileUrls.aadharBack!
        );

        console.log("extracted data", aadharExtractedData);

        // Check if extraction was successful
        if (!aadharExtractedData.isVerified) {
          logger.warn(`⚠️  Partial OCR extraction - some fields missing`);
        }
      } catch (error: any) {
        ocrError = error;
        const errorMsg = error.message || 'Unknown OCR error';
        logger.error(`❌ OCR extraction failed: ${errorMsg} `);
        // Continue with upload but mark for manual review
      }

      // 2. Encrypt extracted data (only if we have valid data)
      let encryptedAadharDetails = undefined;

      if (aadharExtractedData && aadharExtractedData.aadharNumber !== 'NOT_FOUND') {
        try {
          encryptedAadharDetails = {
            aadharNumber: encrypt(aadharExtractedData.aadharNumber),
            fullName: encrypt(aadharExtractedData.fullName),
            dob: encrypt(aadharExtractedData.dob),
            gender: encrypt(aadharExtractedData.gender)
          };
          logger.info('🔐 Aadhaar details encrypted successfully');
        } catch (encryptError: any) {
          logger.error('❌ Encryption failed:', encryptError);
          throw createError(
            'Failed to encrypt sensitive data. Please try again.',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }

      // 3. Determine Aadhaar status based on OCR results
      let aadharStatus: 'pending' | 'manual_review' = 'manual_review'; // Default to manual review after submission
      if (ocrError || !aadharExtractedData?.isVerified) {
        aadharStatus = 'manual_review';
        logger.warn(`⚠️  Setting status to manual_review due to OCR issues`);
      }

      const updateData: any = {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : partner.dateOfBirth,
        personalDocuments: {
          aadharFront: finalFileUrls.aadharFront,
          aadharBack: finalFileUrls.aadharBack,
          aadharStatus: aadharStatus
        },
        aadharDetails: encryptedAadharDetails || partner.aadharDetails,
        profilePicture: finalFileUrls.profilePicture,
      };

      const updatedPartner = await this.partnerRepository.updatePartnerStatus(partnerId, updateData);
      if (!updatedPartner) {
        throw createError('Failed to update partner verification status', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Emit event
      this.socketService?.broadcastToAdmins('PARTNER_AADHAAR_SUBMITTED', { partnerId: partner.partnerId });

      const accessToken = this.generateAccessToken(updatedPartner);
      const refreshToken = this.generateRefreshToken(updatedPartner);

      logger.info(`✅ Partner Aadhaar verification completed: ${updatedPartner.email} (Status: ${aadharStatus})`);

      // If OCR failed, include that in the message
      let message = 'Aadhaar documents uploaded successfully!';
      if (aadharStatus === 'manual_review') {
        message += ' Documents are under manual review due to OCR processing issues.';
      } else {
        message += ' Verification is pending.';
      }

      return {
        partner: updatedPartner,
        message,
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('Partner Aadhaar verification failed:', error);
      throw error;
    }
  }

  /**
   * Request an OTP for partner login.
   */
  async requestLoginOtp(email: string): Promise<{ message: string }> {
    try {
      const partner = await this.partnerRepository.findByEmail(email);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_EMAIL_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (!partner.isActive) {
        throw createError(ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.UNAUTHORIZED);
      }

      const otpCode = generateOTP(6);
      await this.otpRepository.createOTP(
        partner._id.toString(),
        OTPType.EMAIL_VERIFICATION,
        otpCode,
        undefined,
        15
      );

      await this.emailService.sendOtpEmail(email, otpCode);
      console.log(`Sent OTP ${otpCode} to email ${email} `); // For debugging purposes only
      logger.info(`Login OTP generated for partner: ${partner.email} `);

      return { message: 'OTP sent successfully to your email' };
    } catch (error) {
      logger.error('Login OTP request failed:', error);
      throw error;
    }
  }

  /**
   * Verify login OTP and return tokens.
   */
  async verifyLoginOtp(email: string, otp: string): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const partner = await this.partnerRepository.findByEmail(email);
      if (!partner) {
        throw createError(ResponseMessages.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
      }

      if (!partner.isActive) {
        throw createError(ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.UNAUTHORIZED);
      }

      const otpVerification = await this.otpRepository.verifyOTP(
        partner._id.toString(),
        OTPType.EMAIL_VERIFICATION,
        otp
      );

      if (!otpVerification.success) {
        throw createError(otpVerification.message, HttpStatus.BAD_REQUEST);
      }

      await this.partnerRepository.updateLastLogin(partner._id.toString());

      const accessToken = this.generateAccessToken(partner);
      const refreshToken = this.generateRefreshToken(partner);
      const verificationStatus = await this.getVerificationStatus(partner._id.toString());

      logger.info(`Partner logged in successfully: ${partner.email} `);

      return {
        user: {
          id: partner._id.toString(),
          email: partner.email,
          fullName: partner.fullName,
          partnerId: partner.partnerId,
          role: 'partner',
          isVerified: partner.isVerified,
          aadhaarVerified: verificationStatus.aadhaarVerified
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Get simplified verification status (Aadhaar only).
   */
  async getVerificationStatus(partnerId: string): Promise<any> {
    try {
      const partner = await this.partnerRepository.getDocumentsByPartnerId(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const aadharStatus = partner.personalDocuments?.aadharStatus || 'not_submitted';
      const aadharApproved = aadharStatus === 'approved';
      const aadhaarVerified = aadharApproved;

      // Update partner's aadhaarVerified flag if it doesn't match
      if (aadhaarVerified !== partner.aadhaarVerified) {
        await this.partnerRepository.updatePartnerStatus(partnerId, {
          aadhaarVerified,
          verifiedAt: aadhaarVerified ? new Date() : undefined
        });
      }

      const canAddProperty = aadhaarVerified && (partner.totalProperties || 0) < (partner.maxProperties || 5);

      return {
        aadharStatus,
        isVerified: partner.isVerified,
        status: partner.status,
        canAddProperty,
        documents: {
          aadharFront: !!partner.personalDocuments?.aadharFront,
          aadharBack: !!partner.personalDocuments?.aadharBack,
          profilePicture: !!partner.profilePicture
        }
      };
    } catch (error) {
      logger.error('Failed to get verification status:', error);
      throw error;
    }
  }

  /**
   * Get partner by ID.
   */
  async getCurrentPartner(partnerId: string): Promise<IPartner> {
    try {
      const partner = await this.partnerRepository.findById(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (!partner.isActive) {
        throw createError(ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.UNAUTHORIZED);
      }

      return partner;
    } catch (error) {
      logger.error('Failed to get current partner:', error);
      throw error;
    }
  }

  /**
   * Refresh partner tokens.
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as JWTPayload;
      const partner = await this.partnerRepository.findById(decoded.userId);
      if (!partner) {
        throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
      }

      if (!partner.isActive) {
        throw createError(ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.UNAUTHORIZED);
      }
      const newAccessToken = this.generateAccessToken(partner);
      return { accessToken: newAccessToken };
    } catch (error) {
      logger.error('Partner token refresh failed:', error);
      throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Send a custom email to a partner.
   */
  async sendEmailToPartner(email: string, subject: string, message: string): Promise<void> {
    try {
      const partner = await this.partnerRepository.findByEmail(email);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_EMAIL_DOES_NOT_EXIST, HttpStatus.NOT_FOUND);
      }
      await this.emailService.sendCustomEmail(email, subject, message);
      logger.info(`Email sent to partner: ${email} `);
    } catch (error) {
      logger.error('Failed to send email to partner:', error);
      throw error;
    }
  }

  /**
   * Generate a unique partner identifier.
   */
  private async generatePartnerId(): Promise<string> {
    const prefix = 'PRT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random} `;
  }

  /**
   * Generate access token.
   */
  private generateAccessToken(partner: IPartner): string {
    const payload: JWTPayload = {
      userId: partner._id.toString(),
      email: partner.email,
      role: UserRole.PARTNER,
    };
    const secret: Secret = config.jwtSecret;
    const options: SignOptions = {
      expiresIn: config.jwtRefreshExpiration as any,
    };
    return jwt.sign(payload, secret, options);
  }

  /**
   * Generate refresh token.
   */
  private generateRefreshToken(partner: IPartner): string {
    const payload: JWTPayload = {
      userId: partner._id.toString(),
      email: partner.email,
      role: UserRole.PARTNER
    };
    const secret: Secret = config.jwtSecret;
    const options: SignOptions = {
      expiresIn: config.jwtRefreshExpiration as any,
    };
    return jwt.sign(payload, secret, options);
  }

  /**
   * Update document verification status.
   */
  async updateDocumentStatus(
    partnerId: string,
    documentType: 'aadhar' | 'banking',
    status: 'approved' | 'rejected' | 'pending',
    rejectionReason?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      switch (documentType) {
        case 'aadhar':
          updateData['personalDocuments.aadharStatus'] = status;
          if (rejectionReason) updateData['personalDocuments.aadharRejectionReason'] = rejectionReason;
          if (status === 'approved') {
            updateData.aadhaarVerified = true;
            updateData.verifiedAt = new Date();
            updateData.isVerified = true; // Also update main isVerified
            updateData.status = 'verified';
          } else if (status === 'rejected') {
            updateData.aadhaarVerified = false;
            updateData.isVerified = false;
            updateData.status = 'rejected';
          }
          break;
        case 'banking':
          updateData['bankingDetails.status'] = status;
          if (rejectionReason) updateData['bankingDetails.rejectionReason'] = rejectionReason;
          break;
        default:
          throw createError(`Invalid document type: ${documentType} `, HttpStatus.BAD_REQUEST);
      }

      await this.partnerRepository.updatePartnerStatus(partnerId, updateData);

      const partner = await this.partnerRepository.findById(partnerId);

      // Events
      if (documentType === 'aadhar') {
        if (status === 'approved') {
          this.socketService?.broadcastToPartners('PARTNER_VERIFICATION_APPROVED', { partnerId, email: partner?.email });
          this.socketService?.sendNotificationToUser(partnerId, {
            type: 'system',
            title: 'Verification Approved',
            message: 'Your Aadhaar verification is complete. You can now add properties.'
          });
          // Also send email
          if (partner?.email) {
            await this.emailService.sendCustomEmail(partner.email, 'Verification Successful', 'Your Aadhaar verification is complete. You can now add properties.');
          }
        } else if (status === 'rejected') {
          this.socketService?.broadcastToPartners('PARTNER_VERIFICATION_REJECTED', { partnerId, email: partner?.email, reason: rejectionReason });
          this.socketService?.sendNotificationToUser(partnerId, {
            type: 'system',
            title: 'Verification Rejected',
            message: `Your verification failed: ${rejectionReason}. Please re - upload.`
          });
          if (partner?.email) {
            await this.emailService.sendCustomEmail(partner.email, 'Verification Failed', `Reason: ${rejectionReason}. Please re - upload documents.`);
          }
        }
      }

      logger.info(`Admin updated ${documentType} status to ${status} for partner ${partnerId}`);
    } catch (error) {
      logger.error('Failed to update document status:', error);
      throw error;
    }
  }

  /**
   * Get all partners.
   */
  async getAllPartners(
    pagination?: PaginationOptions,
    filter?: {
      isActive?: boolean;
      isVerified?: boolean;
      search?: string;
      aadharStatus?: string;
    }
  ): Promise<PaginatedResult<IPartner> | IPartner[]> {
    try {
      logger.info('Getting all partners', { pagination, filter });

      const queryFilter: any = {};

      if (filter?.aadharStatus) {
        queryFilter['personalDocuments.aadharStatus'] = filter.aadharStatus;
      }

      if (filter?.isActive !== undefined) {
        queryFilter.isActive = filter.isActive;
      }

      if (filter?.isVerified !== undefined) {
        queryFilter.isVerified = filter.isVerified;
      }

      if (filter?.search) {
        const searchRegex = { $regex: filter.search, $options: 'i' };
        queryFilter.$or = [
          { fullName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { partnerId: searchRegex }
        ];
      }

      const pageOptions = pagination || { page: 1, limit: 10 };

      const result = await this.partnerRepository.findAll(queryFilter, pageOptions);

      if (Array.isArray(result)) {
        const processed = await Promise.all(result.map(partner => this.injectSignedUrls(partner)));
        return processed.map(p => this.injectDecryptedDetails(p));
      } else {
        result.data = await Promise.all(result.data.map(partner => this.injectSignedUrls(partner)));
        result.data = result.data.map(p => this.injectDecryptedDetails(p));
        return result;
      }
    } catch (error) {
      logger.error('Failed to get all partners:', error);
      throw error;
    }
  }

  /**
   * Update partner activation status.
   */
  async updatePartnerStatus(
    partnerId: string,
    updateData: Partial<IPartner> | any
  ): Promise<IPartner | null> {
    try {
      // Handle Encryption for Manual Entry
      if (updateData.personalDocuments?.aadharNumber) {
        const plainAadhar = updateData.personalDocuments.aadharNumber;

        // Encrypt and update aadharDetails
        updateData.aadharDetails = updateData.aadharDetails || {};
        updateData.aadharDetails.aadharNumber = encrypt(plainAadhar);

        // Ensure explicit removal of plain text from personalDocuments to avoid duplication/security risk
        // We set it to undefined so it doesn't get saved if the repository handles it, 
        // or if using $set, we might need to be careful. 
        // Assuming Mongoose: if we pass it, it saves. If we modify the object, it saves that.
        // Let's remove it from the update payload.
        delete updateData.personalDocuments.aadharNumber;
      }

      // Handle top-level fields that should sync to aadharDetails (if admins edit them as "verified")
      if (updateData.fullName) {
        updateData.aadharDetails = updateData.aadharDetails || {};
        updateData.aadharDetails.fullName = encrypt(updateData.fullName);
      }
      if (updateData.dateOfBirth) {
        updateData.aadharDetails = updateData.aadharDetails || {};
        updateData.aadharDetails.dob = encrypt(updateData.dateOfBirth);
      }
      if (updateData.gender) {
        updateData.aadharDetails = updateData.aadharDetails || {};
        updateData.aadharDetails.gender = encrypt(updateData.gender);
      }

      const updatedPartner = await this.partnerRepository.updatePartnerStatus(partnerId, updateData);
      if (updatedPartner) {
        const withUrls = await this.injectSignedUrls(updatedPartner);
        return this.injectDecryptedDetails(withUrls);
      }
      return null;
    } catch (error) {
      logger.error('Failed to update partner status:', error);
      throw error;
    }
  }

  /**
   * Get detailed verification view.
   */
  async getDetailedVerificationStatus(partnerId: string): Promise<{
    isVerified: boolean;
    aadhaarStatus: string;
    totalProperties: number;
    canAddProperty: boolean;
    remainingSlots: number;
    sections: any;
  }> {
    try {
      const partner = await this.partnerRepository.getDocumentsByPartnerId(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const personalInfoComplete = !!(
        partner.fullName &&
        partner.email &&
        partner.phone &&
        partner.profilePicture
      );

      const aadharStatus = partner.personalDocuments?.aadharStatus || 'incomplete';
      const aadharApproved = aadharStatus === 'approved';

      const canAddProperty = aadharApproved && (partner.totalProperties || 0) < (partner.maxProperties || 5);
      const remainingSlots = Math.max(0, (partner.maxProperties || 5) - (partner.totalProperties || 0));

      const sections = {
        personalInformation: {
          status: personalInfoComplete ? 'completed' : 'incomplete',
          isApproved: personalInfoComplete
        },
        aadhaarVerification: {
          status: aadharStatus,
          isApproved: aadharApproved,
          frontUrl: partner.personalDocuments?.aadharFront,
          backUrl: partner.personalDocuments?.aadharBack,
          rejectionReason: partner.personalDocuments?.aadharRejectionReason
        }
      };

      return {
        isVerified: aadharApproved,
        aadhaarStatus: aadharStatus,
        totalProperties: partner.totalProperties || 0,
        canAddProperty,
        remainingSlots,
        sections
      };
    } catch (error) {
      logger.error('Failed to get detailed verification status:', error);
      throw error;
    }
  }

  /**
   * Check if a partner can add a new property.
   */
  async canAddProperty(partnerId: string): Promise<boolean> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) return false;

    return !!(partner.aadhaarVerified && (partner.totalProperties || 0) < (partner.maxProperties || 5));
  }

  /**
   * Generate signed URL for profile picture
   */
  async getProfilePictureUrl(partnerId: string): Promise<string> {
    try {
      const partner = await this.partnerRepository.findById(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (!partner.profilePicture) {
        throw createError('Profile picture not found', HttpStatus.NOT_FOUND);
      }

      // Extract S3 key from URL
      const key = this.extractS3KeyFromUrl(partner.profilePicture);

      // Generate signed URL (valid for 1 hour)
      const command = new GetObjectCommand({
        Bucket: config.aws.s3BucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: config.signedUrlExpiration });
      logger.debug(`Generated signed URL for profile picture: ${partnerId} `);

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate profile picture URL:', error);
      throw error;
    }
  }

  /**
   * Generate signed URLs for Aadhaar documents
   */
  async getAadhaarDocumentUrls(partnerId: string): Promise<{ aadharFront?: string; aadharBack?: string }> {
    try {
      const partner = await this.partnerRepository.findById(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const urls: { aadharFront?: string; aadharBack?: string } = {};

      // Generate signed URL for Aadhaar front
      if (partner.personalDocuments?.aadharFront) {
        const frontKey = this.extractS3KeyFromUrl(partner.personalDocuments.aadharFront);
        const frontCommand = new GetObjectCommand({
          Bucket: config.aws.s3BucketName,
          Key: frontKey,
        });
        urls.aadharFront = await getSignedUrl(this.s3Client, frontCommand, { expiresIn: config.signedUrlExpiration });
      }

      // Generate signed URL for Aadhaar back
      if (partner.personalDocuments?.aadharBack) {
        const backKey = this.extractS3KeyFromUrl(partner.personalDocuments.aadharBack);
        const backCommand = new GetObjectCommand({
          Bucket: config.aws.s3BucketName,
          Key: backKey,
        });
        urls.aadharBack = await getSignedUrl(this.s3Client, backCommand, { expiresIn: config.signedUrlExpiration });
      }

      logger.debug(`Generated signed URLs for Aadhaar documents: ${partnerId} `);
      return urls;
    } catch (error) {
      logger.error('Failed to generate Aadhaar document URLs:', error);
      throw error;
    }
  }

  private extractS3KeyFromUrl(url: string): string {
    // Format: https://bucket-name.s3.region.amazonaws.com/path/to/file?X-Amz...
    const urlParts = url.replace('https://', '').split('/');
    const keyWithQuery = urlParts.slice(1).join('/'); // Remove bucket part
    return keyWithQuery.split('?')[0]; // Strip query parameters
  }

  /**
   * Inject signed URLs into partner object
   */
  public async injectSignedUrls(partner: IPartner): Promise<IPartner> {
    const partnerObj = partner.toObject ? partner.toObject() : { ...partner };

    try {
      // Profile Picture
      if (partnerObj.profilePicture) {
        try {
          const key = this.extractS3KeyFromUrl(partnerObj.profilePicture);
          const command = new GetObjectCommand({
            Bucket: config.aws.s3BucketName,
            Key: key,
          });
          partnerObj.profilePicture = await getSignedUrl(this.s3Client, command, { expiresIn: config.signedUrlExpiration });
        } catch (err) {
          logger.warn(`Failed to sign profile picture for ${partnerObj._id}: `, err);
        }
      }

      // Aadhaar Documents
      if (partnerObj.personalDocuments) {
        if (partnerObj.personalDocuments.aadharFront) {
          try {
            const key = this.extractS3KeyFromUrl(partnerObj.personalDocuments.aadharFront);
            const command = new GetObjectCommand({
              Bucket: config.aws.s3BucketName,
              Key: key,
            });
            partnerObj.personalDocuments.aadharFront = await getSignedUrl(this.s3Client, command, { expiresIn: config.signedUrlExpiration });
          } catch (err) {
            logger.warn(`Failed to sign aadharFront for ${partnerObj._id}: `, err);
          }
        }
        if (partnerObj.personalDocuments.aadharBack) {
          try {
            const key = this.extractS3KeyFromUrl(partnerObj.personalDocuments.aadharBack);
            const command = new GetObjectCommand({
              Bucket: config.aws.s3BucketName,
              Key: key,
            });
            partnerObj.personalDocuments.aadharBack = await getSignedUrl(this.s3Client, command, { expiresIn: config.signedUrlExpiration });
          } catch (err) {
            logger.warn(`Failed to sign aadharBack for ${partnerObj._id}: `, err);
          }
        }
      }

    } catch (error) {
      logger.error('Error injecting signed URLs:', error);
    }

    return partnerObj;
  }

  /**
   * Inject decrypted Aadhaar details into partner object for Admin view
   */
  public injectDecryptedDetails(partner: IPartner | any): IPartner | any {
    const partnerObj = partner.toObject ? partner.toObject() : { ...partner };

    try {
      if (partnerObj.aadharDetails) {
        // Helper to safe decrypt keys within aadharDetails
        const safeDecrypt = (text?: string) => {
          if (!text) return undefined;
          try {
            if (text.includes(':')) {
              return decrypt(text);
            }
            return text;
          } catch (err) {
            return text;
          }
        };

        const decryptedNumber = safeDecrypt(partnerObj.aadharDetails.aadharNumber);

        // Populate personalDocuments for frontend compatibility
        if (partnerObj.personalDocuments) {
          // We set the plain text version ONLY in the response object, not database
          if (decryptedNumber) partnerObj.personalDocuments.aadharNumber = decryptedNumber;
          // Map backend aadharRejectionReason to frontend rejectionReason expectation
          if (partnerObj.personalDocuments.aadharRejectionReason) {
            partnerObj.personalDocuments.rejectionReason = partnerObj.personalDocuments.aadharRejectionReason;
          }
        }

        // Also expose decrypted values in aadharDetails for convenience
        partnerObj.aadharDetails = {
          ...partnerObj.aadharDetails,
          aadharNumber: decryptedNumber,
          fullName: safeDecrypt(partnerObj.aadharDetails.fullName),
          dob: safeDecrypt(partnerObj.aadharDetails.dob),
          gender: safeDecrypt(partnerObj.aadharDetails.gender)
        };
      }
      return partnerObj;
    } catch (error) {
      logger.error('Failed to inject decrypted details:', error);
      return partnerObj;
    }
  }
}
