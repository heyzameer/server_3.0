// src/services/PartnerService.ts
import { injectable, inject } from 'tsyringe';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { createError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { generateOTP, hashPassword } from '../utils/helpers';
import { JWTPayload, OTPType, PaginatedResult, PaginationOptions, PartnerRegistrationData, UserRole } from '../types';
import config from '../config';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { IPartner } from '../interfaces/IModel/IPartner';
import { IEmailService } from '../interfaces/IService/IEmailService';
import { IPartnerService } from '../interfaces/IService/IPartnerService';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';

/**
 * Service for handling partner-related operations.
 * Implements registration, verification, and profile management for partners.
 */
@injectable()
export class PartnerService implements IPartnerService {
  constructor(
    @inject('PartnerRepository') private partnerRepository: IPartnerRepository,
    @inject('OTPRepository') private otpRepository: IOTPRepository,
    @inject('EmailService') private emailService: IEmailService
  ) { }

  /**
   * Register a new partner (concise version).
   */
  /**
   * 
   * @param userData 
   * @returns 
   */
  async registerPartner(userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
  }): Promise<{ user: IPartner; accessToken: string; refreshToken: string }> {
    try {
      const existingPartner = await this.partnerRepository.findByEmail(userData.email);
      if (existingPartner) {
        throw createError(ResponseMessages.EMAIL_ALREADY_REGISTERED, HttpStatus.BAD_REQUEST);
      }
      const partnerId = await this.generatePartnerId();
      const hashedPassword = await hashPassword(userData.password);

      const partner = await this.partnerRepository.create({
        ...userData,
        partnerId,
        password: hashedPassword,
      });

      const accessToken = this.generateAccessToken(partner);
      const refreshToken = this.generateRefreshToken(partner);

      await this.requestLoginOtp(partner.email);

      logger.info(`Partner registered successfully: ${partner.email}`);

      return {
        user: partner,
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Partner registration failed:', error);
      throw error;
    }
  }

  /**
   * Register a partner with documents.
   */
  /**
   * 
   * @param registrationData 
   * @param fileUrls 
   * @returns 
   */
  async register(
    registrationData: PartnerRegistrationData,
    fileUrls: { [key: string]: string }
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
        dateOfBirth: new Date(registrationData.dateOfBirth),
        profilePicture: fileUrls.profilePicture || '',
        personalDocuments: {
          aadharFront: fileUrls.aadharFront || '',
          aadharBack: fileUrls.aadharBack || '',
          panFront: fileUrls.panFront || '',
          panBack: fileUrls.panBack || '',
          licenseFront: fileUrls.licenseFront || '',
          licenseBack: fileUrls.licenseBack || '',
        },
        vehicalDocuments: {
          insuranceDocument: fileUrls.insuranceDocument || '',
          pollutionDocument: fileUrls.pollutionDocument || '',
          registrationNumber: registrationData.vehicalDocuments.registrationNumber,
          vehicleType: registrationData.vehicalDocuments.vehicleType
        }
      });

      const accessToken = this.generateAccessToken(partner);
      const refreshToken = this.generateRefreshToken(partner);

      logger.info(`Partner registered successfully: ${partner.email}`);

      return {
        partner,
        message: 'Registration successful! Your application is under review.',
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('Partner registration failed:', error);
      throw error;
    }
  }

  /**
   * Request an OTP for partner login.
   */
  /**
   * 
   * @param email 
   * @returns 
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
      console.log(`Sent OTP ${otpCode} to email ${email}`); // For debugging purposes only
      logger.info(`Login OTP generated for partner: ${partner.email}`);

      return { message: 'OTP sent successfully to your email' };
    } catch (error) {
      logger.error('Login OTP request failed:', error);
      throw error;
    }
  }

  /**
   * Verify login OTP and return tokens.
   */
  /**
   * 
   * @param email 
   * @param otp 
   * @returns 
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

      logger.info(`Partner logged in successfully: ${partner.email}`);

      return {
        user: {
          id: partner._id.toString(),
          email: partner.email,
          fullName: partner.fullName,
          partnerId: partner.partnerId,
          role: 'partner',
          isVerified: partner.isVerified,
          verificationStatus: verificationStatus.verificationStatus
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
   * Get modular verification status of sections.
   */
  /**
   * 
   * @param partnerId 
   * @returns 
   */
  async getVerificationStatus(partnerId: string): Promise<{
    isVerified: boolean;
    verificationStatus: {
      personalInformation: boolean;
      personalDocuments: boolean;
      vehicalDocuments: boolean;
      bankingDetails: boolean;
    };
  }> {
    try {
      const partner = await this.partnerRepository.getDocumentsByPartnerId(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const verificationStatus = {
        personalInformation: !!(
          partner.fullName &&
          partner.email &&
          partner.phone &&
          partner.dateOfBirth &&
          partner.profilePicture
        ),
        personalDocuments: (
          partner.personalDocuments?.aadharStatus === 'approved' &&
          partner.personalDocuments?.panStatus === 'approved' &&
          partner.personalDocuments?.licenseStatus === 'approved'
        ),
        vehicalDocuments: (
          partner.vehicalDocuments?.insuranceStatus === 'approved' &&
          partner.vehicalDocuments?.pollutionStatus === 'approved'
        ),
        bankingDetails: (
          partner.bankingDetails?.bankingStatus === 'approved'
        )
      };

      const isVerified = Object.values(verificationStatus).every(status => status === true);

      if (isVerified !== partner.isVerified) {
        await this.partnerRepository.updateVerificationStatus(partnerId, isVerified);
      }

      return {
        isVerified,
        verificationStatus
      };
    } catch (error) {
      logger.error('Failed to get verification status:', error);
      throw error;
    }
  }

  /**
   * Get partner by ID.
   */
  /**
   * 
   * @param partnerId 
   * @returns 
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
  /**
   * 
   * @param refreshToken 
   * @returns 
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as JWTPayload;
      const partner = await this.partnerRepository.findById(decoded.userId);
      if (!partner || !partner.isActive) {
        throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
      }
      const newAccessToken = this.generateAccessToken(partner);
      return { accessToken: newAccessToken };
    } catch (error) {
      logger.error('Partner token refresh failed:', error);
      throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
    }
  }

  /**   * Send a custom email to a partner.
   * param email - Partner's email address.
   * param subject - Subject of the email.
   * param message - Body of the email.
   */
  /**
   * 
   * @param email 
   * @param subject 
   * @param message 
   */
  async sendEmailToPartner(email: string, subject: string, message: string): Promise<void> {
    try {
      const partner = await this.partnerRepository.findByEmail(email);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_EMAIL_DOES_NOT_EXIST, HttpStatus.NOT_FOUND);
      }
      await this.emailService.sendCustomEmail(email, subject, message);
      logger.info(`Email sent to partner: ${email}`);
    } catch (error) {
      logger.error('Failed to send email to partner:', error);
      throw error;
    }
  }

  /**
   * Generate a unique partner identifier.
   */
  /**
   * 
   * @returns 
   */
  private async generatePartnerId(): Promise<string> {
    const prefix = 'PRT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Generate access token.
   */
  /**
   * 
   * @param partner 
   * @returns 
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
  /**
   * 
   * @param partner 
   * @returns 
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
  /**
   * 
   * @param partnerId 
   * @param documentType 
   * @param status 
   * @param rejectionReason 
   */
  async updateDocumentStatus(
    partnerId: string,
    documentType: 'aadhar' | 'pan' | 'license' | 'insurance' | 'pollution' | 'banking',
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
          break;
        case 'pan':
          updateData['personalDocuments.panStatus'] = status;
          if (rejectionReason) updateData['personalDocuments.panRejectionReason'] = rejectionReason;
          break;
        case 'license':
          updateData['personalDocuments.licenseStatus'] = status;
          if (rejectionReason) updateData['personalDocuments.licenseRejectionReason'] = rejectionReason;
          break;
        case 'insurance':
          updateData['vehicalDocuments.insuranceStatus'] = status;
          if (rejectionReason) updateData['vehicalDocuments.insuranceRejectionReason'] = rejectionReason;
          break;
        case 'pollution':
          updateData['vehicalDocuments.pollutionStatus'] = status;
          if (rejectionReason) updateData['vehicalDocuments.pollutionRejectionReason'] = rejectionReason;
          break;
        case 'banking':
          updateData['bankingDetails.status'] = status;
          if (rejectionReason) updateData['bankingDetails.rejectionReason'] = rejectionReason;
          break;
        default:
          throw createError(`Invalid document type: ${documentType}`, HttpStatus.BAD_REQUEST);
      }

      // TODO: Implement the persistence logic in the repository if needed, or use existing generic update.
      // await this.getVerificationStatus(partnerId);
      logger.info(`Admin updated ${documentType} status to ${status} for partner ${partnerId}`);
    } catch (error) {
      logger.error('Failed to update document status:', error);
      throw error;
    }
  }

  /**
   * Get all partners.
   */
  /**
   * 
   * @param pagination 
   * @param filter 
   * @returns 
   */
  async getAllPartners(
    pagination?: PaginationOptions,
    _filter?: {
      isActive?: boolean;
      isVerified?: boolean;
      search?: string;
    }
  ): Promise<PaginatedResult<IPartner> | IPartner[]> {
    try {
      logger.info('Getting all partners', { pagination });
      const result = await this.partnerRepository.findVerifiedPartners({});
      return result;
    } catch (error) {
      logger.error('Failed to get all partners:', error);
      throw error;
    }
  }

  /**
   * Update partner activation status.
   */
  /**
   * 
   * @param partnerId 
   * @param updateData 
   * @returns 
   */
  async updatePartnerStatus(
    partnerId: string,
    updateData: Partial<IPartner>
  ): Promise<IPartner | null> {
    try {
      const updatedPartner = await this.partnerRepository.updatePartnerStatus(partnerId, updateData);
      return updatedPartner;
    } catch (error) {
      logger.error('Failed to update partner status:', error);
      throw error;
    }
  }

  /**
   * Get detailed verification view.
   */
  /**
   * 
   * @param partnerId 
   * @returns 
   */
  async getDetailedVerificationStatus(partnerId: string): Promise<any> {
    try {
      const partner = await this.partnerRepository.getDocumentsByPartnerId(partnerId);
      if (!partner) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const personalInfoComplete = !!(
        partner.fullName &&
        partner.email &&
        partner.phone &&
        partner.dateOfBirth &&
        partner.profilePicture
      );

      const aadharStatus = partner.personalDocuments?.aadharStatus || 'incomplete';
      const panStatus = partner.personalDocuments?.panStatus || 'incomplete';
      const licenseStatus = partner.personalDocuments?.licenseStatus || 'incomplete';

      const aadharApproved = aadharStatus === 'approved';
      const panApproved = panStatus === 'approved';
      const licenseApproved = licenseStatus === 'approved';
      const personalDocsApproved = aadharApproved && panApproved && licenseApproved;

      const insuranceStatus = partner.vehicalDocuments?.insuranceStatus || 'incomplete';
      const pollutionStatus = partner.vehicalDocuments?.pollutionStatus || 'incomplete';

      const insuranceApproved = insuranceStatus === 'approved';
      const pollutionApproved = pollutionStatus === 'approved';
      const vehicleDocsApproved = insuranceApproved && pollutionApproved;

      const bankingStatus = partner.bankingDetails?.bankingStatus || 'incomplete';
      const bankingApproved = bankingStatus === 'approved';

      const sections = {
        personalInformation: {
          status: personalInfoComplete ? 'completed' : 'incomplete',
          isApproved: personalInfoComplete
        },
        personalDocuments: {
          status: personalDocsApproved ? 'approved' :
            (aadharStatus === 'pending' || panStatus === 'pending' || licenseStatus === 'pending') ? 'pending' :
              (aadharStatus === 'rejected' || panStatus === 'rejected' || licenseStatus === 'rejected') ? 'rejected' :
                'incomplete',
          isApproved: personalDocsApproved,
          documents: {
            aadhar: {
              status: aadharStatus,
              isApproved: aadharApproved,
              hasFile: !!(partner.personalDocuments?.aadharFront && partner.personalDocuments?.aadharBack),
              frontUrl: partner.personalDocuments?.aadharFront,
              backUrl: partner.personalDocuments?.aadharBack
            },
            pan: {
              status: panStatus,
              isApproved: panApproved,
              hasFile: !!(partner.personalDocuments?.panFront && partner.personalDocuments?.panBack),
              frontUrl: partner.personalDocuments?.panFront,
              backUrl: partner.personalDocuments?.panBack
            },
            license: {
              status: licenseStatus,
              isApproved: licenseApproved,
              hasFile: !!(partner.personalDocuments?.licenseFront && partner.personalDocuments?.licenseBack),
              frontUrl: partner.personalDocuments?.licenseFront,
              backUrl: partner.personalDocuments?.licenseBack
            }
          }
        },
        vehicalDocuments: {
          status: vehicleDocsApproved ? 'approved' :
            (insuranceStatus === 'pending' || pollutionStatus === 'pending') ? 'pending' :
              (insuranceStatus === 'rejected' || pollutionStatus === 'rejected') ? 'rejected' :
                'incomplete',
          isApproved: vehicleDocsApproved,
          documents: {
            insurance: {
              status: insuranceStatus,
              isApproved: insuranceApproved,
              hasFile: !!partner.vehicalDocuments?.insuranceDocument,
              url: partner.vehicalDocuments?.insuranceDocument
            },
            pollution: {
              status: pollutionStatus,
              isApproved: pollutionApproved,
              hasFile: !!partner.vehicalDocuments?.pollutionDocument,
              url: partner.vehicalDocuments?.pollutionDocument
            }
          }
        },
        bankingDetails: {
          status: bankingStatus === 'approved' ? 'approved' : 'pending',
          isApproved: bankingApproved,
          hasCompleteInfo: !!(
            partner.bankingDetails?.accountNumber &&
            partner.bankingDetails?.ifscCode &&
            partner.bankingDetails?.accountHolderName
          )
        }
      };

      const isVerified = personalInfoComplete && personalDocsApproved && vehicleDocsApproved && bankingApproved;

      return {
        isVerified,
        overallStatus: isVerified ? 'approved' : 'pending',
        sections
      };
    } catch (error) {
      logger.error('Failed to get detailed verification status:', error);
      throw error;
    }
  }
}