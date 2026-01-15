import { OTPType } from '../../types';
import { IOTP } from '../IModel/IOTP';

export interface IOTPRepository {
  findValidOTP(userId: string, type: OTPType, code: string): Promise<IOTP | null>;
  createOTP(userId: string, type: OTPType, code: string, orderId?: string, expirationMinutes?: number): Promise<IOTP>;
  verifyOTP(userId: string, type: OTPType, code: string): Promise<{ success: boolean; message: string }>;
  cleanupExpiredOTPs(): Promise<number>;
  getOTPAttempts(userId: string, type: OTPType): Promise<number>;
  findByOrderAndType(orderId: string, type: OTPType): Promise<IOTP | null>;
}