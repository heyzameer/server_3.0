import { UserRole, OTPType, JWTPayload } from '../../types';
import { IUser } from '../IModel/IUser';

export interface IAuthService {
  register(userData: any): Promise<{ user: IUser; accessToken: string; refreshToken: string }>;
  login(email: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }>;
  adminLogin(email: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, otpCode: string, password: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  requestOTPVerification(userId: string, type: OTPType): Promise<void>;
  verifyOTP(userId: string, type: OTPType, otpCode: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string }>;
  logout(userId: string): Promise<void>;
  validateToken(token: string): Promise<JWTPayload>;
  getUserFromToken(token: string): Promise<IUser>;
  generateVerificationOTPs(userId: string, type: OTPType): Promise<void>;
  generateAccessToken(user: IUser): string;
  generateRefreshToken(user: IUser): string;
}