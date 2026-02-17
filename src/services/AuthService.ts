// import { UserRepository } from '../repositories/UserRepository';
// import { OTPRepository } from '../repositories/OTPRepository';
import { UserRole, OTPType, JWTPayload } from '../types';
import { hashPassword, comparePassword, generateOTP } from '../utils/helpers';
import { createError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import config from '../config';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { injectable, inject } from 'tsyringe';
import { IAuthService } from '../interfaces/IService/IAuthService';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';
import { IUser } from '../interfaces/IModel/IUser';
import { IEmailService } from '../interfaces/IService/IEmailService';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';

@injectable()
export class AuthService implements IAuthService {

  constructor(
    @inject('UserRepository') private userRepository: IUserRepository,
    @inject('PartnerRepository') private partnerRepository: IPartnerRepository,
    @inject('OTPRepository') private otpRepository: IOTPRepository,
    @inject('EmailService') private emailService: IEmailService
  ) { }

  /**
   * 
   * @param userData 
   * @returns 
   */
  async register(userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
  }): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmailOrPhone(
        userData.email,
        userData.phone
      );


      if (existingUser) {
        if (existingUser.email === userData.email.toLowerCase()) {
          throw createError(ResponseMessages.EMAIL_ALREADY_REGISTERED, HttpStatus.BAD_REQUEST);
        }
        if (existingUser.phone === userData.phone) {
          throw createError(ResponseMessages.PHONE_ALREADY_REGISTERED, HttpStatus.BAD_REQUEST);
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || UserRole.CUSTOMER,
      });

      // Generate JWT token
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user)

      // Generate verification OTPs
      await this.generateVerificationOTPs(user._id.toString(), user.email,);

      logger.info(`User registered successfully: ${user.email}`);

      return { user, accessToken, refreshToken };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }


  /**
   * 
   * @param email 
   * @param password 
   * @returns 
   */
  async login(email: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw createError(ResponseMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
      }

      // Check if user is active
      if (!user.isActive) {
        throw createError(ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.UNAUTHORIZED);
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw createError(ResponseMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
      }

      // Update last login
      await this.userRepository.updateLastLogin(user._id.toString());

      // Generate JWT token
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info(`User logged in successfully: ${user.email}`);

      return { user, accessToken, refreshToken };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param email 
   * @param password 
   * @returns 
   */
  async adminLogin(email: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw createError(ResponseMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
      }
      // Check if user is active
      if (!user.isActive) {
        throw createError(ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.UNAUTHORIZED);
      }

      // Check if user is admin
      if (user.role !== UserRole.ADMIN) {
        throw createError(ResponseMessages.ACCESS_DENIED, HttpStatus.FORBIDDEN);
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw createError(ResponseMessages.INVALID_CREDENTIALS, HttpStatus.UNAUTHORIZED);
      }

      // Update last login
      await this.userRepository.updateLastLogin(user._id.toString());

      // Generate JWT token
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info(`Admin user logged in successfully: ${user.email}`);

      return { user, accessToken, refreshToken };
    } catch (error) {
      logger.error('Admin login failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param email 
   * @returns 
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return;
      }

      // Generate OTP for password reset
      const otpCode = generateOTP(6);
      await this.otpRepository.createOTP(
        user._id.toString(),
        OTPType.EMAIL_VERIFICATION,
        otpCode,
        undefined,
        30 // 30 minutes expiration
      );

      // TODO: Send email with OTP
      this.emailService.sendOtpEmail(user.email, otpCode);
      logger.info(`Password reset OTP generated for user: ${user.email}`);
    } catch (error) {
      logger.error('Password reset request failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param email 
   * @param otp 
   * @param password 
   */
  async resetPassword(email: string, otp: string, password: string): Promise<void> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw createError(ResponseMessages.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
      }

      // Verify OTP
      const otpVerification = await this.otpRepository.verifyOTP(
        user._id.toString(),
        OTPType.EMAIL_VERIFICATION,
        otp
      );

      if (!otpVerification.success) {
        throw createError(otpVerification.message, HttpStatus.BAD_REQUEST);
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password
      await this.userRepository.update(user._id.toString(), {
        password: hashedPassword,
      });

      logger.info(`Password reset successfully for user: ${user.email}`);
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param userId 
   * @param currentPassword 
   * @param newPassword 
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      // Get user with password field
      const userWithPassword = await this.userRepository.findByEmail(user.email);
      if (!userWithPassword) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        userWithPassword.password
      );
      if (!isCurrentPasswordValid) {
        throw createError(ResponseMessages.CURRENT_PASSWORD_INCORRECT, HttpStatus.BAD_REQUEST);
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await this.userRepository.update(userId, {
        password: hashedPassword,
      });

      logger.info(`Password changed successfully for user: ${user.email}`);
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param userId 
   * @param type 
   */
  async requestOTPVerification(userId: string, type: OTPType): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      // Generate OTP
      const otpCode = generateOTP(6);
      await this.otpRepository.createOTP(
        userId,
        type,
        otpCode,
        undefined,
        config.otp.expirationMinutes
      );

      // TODO: Send OTP via SMS or email based on type
      if (type === OTPType.PHONE_VERIFICATION) {
        // await this.smsService.sendOTP(user.phone, otpCode);
      } else if (type === OTPType.EMAIL_VERIFICATION) {
        await this.emailService.sendOtpEmail(user.email, otpCode);
      }

      logger.info(`OTP requested for user: ${user.email}, type: ${type}`);
    } catch (error) {
      logger.error('OTP request failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param userId 
   * @param type 
   * @param otpCode 
   */
  async verifyOTP(userId: string, type: OTPType, otpCode: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      // Verify OTP
      const otpVerification = await this.otpRepository.verifyOTP(userId, type, otpCode);

      if (!otpVerification.success) {
        throw createError(otpVerification.message, HttpStatus.BAD_REQUEST);
      }

      // Update user verification status
      if (type === OTPType.EMAIL_VERIFICATION) {
        await this.userRepository.verifyEmail(userId);
      } else if (type === OTPType.PHONE_VERIFICATION) {
        await this.userRepository.verifyPhone(userId);
      }

      logger.info(`OTP verified successfully for user: ${user.email}, type: ${type}`);
    } catch (error) {
      logger.error('OTP verification failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param refreshToken 
   * @returns 
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as JWTPayload;

      // Check both repositories
      const user = await this.userRepository.findById(decoded.userId);
      const partner = !user ? await this.partnerRepository.findById(decoded.userId) : null;

      const account = user || partner;

      if (!account) {
        throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
      }

      if (!account.isActive) {
        throw createError(ResponseMessages.ACCOUNT_DEACTIVATED, HttpStatus.UNAUTHORIZED);
      }

      const newAccessToken = this.generateAccessToken(account as any);

      return { accessToken: newAccessToken };
    } catch (error: any) {
      if (error.statusCode === HttpStatus.UNAUTHORIZED) throw error;
      logger.error('Token refresh failed:', error);
      throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
    }
  }
  /**
   * 
   * @param userId 
   */
  async logout(userId: string): Promise<void> {
    try {
      // In a more sophisticated implementation, you might want to:
      // 1. Add token to a blacklist
      // 2. Update user's last logout time
      // 3. Clear any active sessions

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }
  /**
   * 
   * @param user 
   * @returns 
   */
  generateAccessToken(user: IUser): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const secret: Secret = config.jwtSecret;
    const options: SignOptions = {
      expiresIn: config.jwtExpiration as `${number}${"ms" | "s" | "m" | "h" | "d" | "w" | "y"}` | number,
    };

    return jwt.sign(payload, secret, options);
  }
  /**
   * 
   * @param user 
   * @returns 
   */
  generateRefreshToken(user: IUser): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const secret: Secret = config.jwtSecret;
    const options: SignOptions = {
      expiresIn: config.jwtRefreshExpiration as `${number}${"ms" | "s" | "m" | "h" | "d" | "w" | "y"}` | number,
    };

    return jwt.sign(payload, secret, options);
  }
  /**
   * 
   * @param userId 
   * @param email 
   */
  async generateVerificationOTPs(userId: string, email: string): Promise<void> {
    try {
      // Generate email verification OTP
      const emailOTP = generateOTP(6);
      await this.otpRepository.createOTP(
        userId,
        OTPType.EMAIL_VERIFICATION,
        emailOTP,
        undefined,
        config.otp.expirationMinutes
      );

      // Generate phone verification OTP
      const phoneOTP = generateOTP(6);
      await this.otpRepository.createOTP(
        userId,
        OTPType.PHONE_VERIFICATION,
        phoneOTP,
        undefined,
        config.otp.expirationMinutes
      );
      console.log('emailOTP===>', emailOTP);
      console.log('phoneOTP===>', phoneOTP);


      // TODO: Send OTPs via email and SMS
      await this.emailService.sendOtpEmail(email, emailOTP);
      // await this.smsService.sendVerificationOTP(user.phone, phoneOTP);
    } catch (error) {
      logger.error('Failed to generate verification OTPs:', error);
      // Don't throw error as this is not critical for registration
    }
  }
  /**
   * 
   * @param token 
   * @returns 
   */
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

      const user = await this.userRepository.findById(decoded.userId);
      const partner = !user ? await this.partnerRepository.findById(decoded.userId) : null;
      const account = user || partner;

      if (!account || !account.isActive) {
        throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
      }

      return decoded;
    } catch {
      throw createError(ResponseMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Update user profile
   * @param userId 
   * @param updateData 
   * @returns Updated user
   */
  async updateProfile(userId: string, updateData: any): Promise<IUser> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      // Handle profile image upload if present in updateData (it comes from controller as file url)
      // The controller extracts the URL from req.files and passes it in updateData.profileImage

      // Update fields
      const allowedUpdates = ['fullName', 'phone', 'profileImage'];
      const updates: any = {};

      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = updateData[key];
        }
      });

      // Update user
      const updatedUser = await this.userRepository.update(userId, updates);

      if (!updatedUser) {
        throw createError('Failed to update profile', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`User profile updated: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * 
   * @param token 
   * @returns 
   */
  async getUserFromToken(token: string): Promise<IUser> {
    const decoded = await this.validateToken(token);
    const user = await this.userRepository.findById(decoded.userId);
    const partner = !user ? await this.partnerRepository.findById(decoded.userId) : null;

    if (!user && !partner) {
      throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return (user || partner) as any;
  }
}