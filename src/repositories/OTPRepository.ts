import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { OTP } from '../models/OTP';
import { OTPType, OTPStatus } from '../types';
import mongoose from 'mongoose';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { IOTP } from '../interfaces/IModel/IOTP';


@injectable()
export class OTPRepository extends BaseRepository<IOTP>  implements IOTPRepository {
  constructor() {
    super(OTP);
  }

  async findValidOTP(userId: string, type: OTPType, code: string): Promise<IOTP | null> {
    // Call the static method correctly
    return (this.model as any).findValidOTP(userId, type, code);
  }

  async createOTP(
    userId: string,
    type: OTPType,
    code: string,
    orderId?: string,
    expirationMinutes: number = 10
  ): Promise<IOTP> {
    // Invalidate existing OTPs for this user and type
    await this.updateMany(
      { 
        userId: new mongoose.Types.ObjectId(userId), 
        type, 
        status: OTPStatus.PENDING 
      },
      { status: OTPStatus.EXPIRED }
    );

    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const otpData: any = {
      userId: new mongoose.Types.ObjectId(userId),
      type,
      code,
      expiresAt,
      status: OTPStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
    };

    if (orderId) {
      otpData.orderId = new mongoose.Types.ObjectId(orderId);
    }

    return this.create(otpData);
  }

  async verifyOTP(userId: string, type: OTPType, code: string): Promise<{ success: boolean; message: string }> {
    const otp = await this.findValidOTP(userId, type, code);
    
    if (!otp) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    return otp.verify(code);
  }

  async cleanupExpiredOTPs(): Promise<number> {
    // Use the static method
    const result = await (this.model as any).cleanupExpired();
    return result.modifiedCount || 0;
  }

  async getOTPAttempts(userId: string, type: OTPType): Promise<number> {
    const otps = await this.find({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    });

    return otps.reduce((total, otp) => total + otp.attempts, 0);
  }

  async findByOrderAndType(orderId: string, type: OTPType): Promise<IOTP | null> {
    return this.findOne({
      orderId: new mongoose.Types.ObjectId(orderId),
      type,
      status: OTPStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });
  }

  async findByUserAndType(userId: string, type: OTPType): Promise<IOTP | null> {
    return this.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      status: OTPStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });
  }

  async invalidateUserOTPs(userId: string, type?: OTPType): Promise<number> {
    const filter: any = { 
      userId: new mongoose.Types.ObjectId(userId), 
      status: OTPStatus.PENDING 
    };
    
    if (type) {
      filter.type = type;
    }

    const result = await this.updateMany(filter, { status: OTPStatus.EXPIRED });
    return result;
  }

  async getOTPHistory(userId: string, type?: OTPType, limit: number = 10): Promise<IOTP[]> {
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (type) {
      filter.type = type;
    }

    return this.find(filter, { 
      sort: { createdAt: -1 }, 
      limit 
    });
  }

  async getOTPStats(userId?: string): Promise<any> {
    const match: any = {};
    if (userId) {
      match.userId = new mongoose.Types.ObjectId(userId);
    }

    return this.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status'
          },
          count: { $sum: 1 },
          avgAttempts: { $avg: '$attempts' },
          maxAttempts: { $max: '$attempts' }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count',
              avgAttempts: '$avgAttempts',
              maxAttempts: '$maxAttempts'
            }
          },
          totalOTPs: { $sum: '$count' }
        }
      }
    ]);
  }

  async deleteExpiredOTPs(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await this.deleteMany({
      $or: [
        { expiresAt: { $lt: cutoffDate } },
        { 
          status: { $in: [OTPStatus.VERIFIED, OTPStatus.EXPIRED, OTPStatus.FAILED] }, 
          createdAt: { $lt: cutoffDate } 
        }
      ]
    });
    
    return result;
  }

  // Additional helper methods for better OTP management
  async createPickupOTP(userId: string, orderId: string): Promise<IOTP> {
    const code = this.generateOTPCode();
    return this.createOTP(userId, OTPType.PICKUP, code, orderId, 30); // 30 minutes for pickup
  }

  async createDeliveryOTP(userId: string, orderId: string): Promise<IOTP> {
    const code = this.generateOTPCode();
    return this.createOTP(userId, OTPType.DELIVERY, code, orderId, 30); // 30 minutes for delivery
  }

  async createVerificationOTP(userId: string, type: OTPType.PHONE_VERIFICATION | OTPType.EMAIL_VERIFICATION): Promise<IOTP> {
    const code = this.generateOTPCode();
    return this.createOTP(userId, type, code, undefined, 10); // 10 minutes for verification
  }

  async isOTPValidForOrder(orderId: string, type: OTPType, code: string): Promise<boolean> {
    const otp = await this.findOne({
      orderId: new mongoose.Types.ObjectId(orderId),
      type,
      code,
      status: OTPStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });

    return !!otp;
  }

  async getRemainingAttempts(userId: string, type: OTPType): Promise<number> {
    const otp = await this.findByUserAndType(userId, type);
    if (!otp) {
      return 3; // Default max attempts
    }
    return Math.max(0, otp.maxAttempts - otp.attempts);
  }

  async extendOTPExpiration(otpId: string, additionalMinutes: number): Promise<IOTP | null> {
    const otp = await this.findById(otpId);
    if (!otp || otp.status !== OTPStatus.PENDING) {
      return null;
    }

    const newExpiresAt = new Date(otp.expiresAt.getTime() + additionalMinutes * 60 * 1000);
    return this.update(otpId, { expiresAt: newExpiresAt });
  }

  private generateOTPCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  // Batch operations for performance
  async createBulkOTPs(otpRequests: Array<{
    userId: string;
    type: OTPType;
    orderId?: string;
    expirationMinutes?: number;
  }>): Promise<IOTP[]> {
    const otpData = otpRequests.map(request => ({
      userId: new mongoose.Types.ObjectId(request.userId),
      orderId: request.orderId ? new mongoose.Types.ObjectId(request.orderId) : undefined,
      type: request.type,
      code: this.generateOTPCode(),
      expiresAt: new Date(Date.now() + (request.expirationMinutes || 10) * 60 * 1000),
      status: OTPStatus.PENDING,
      attempts: 0,
      maxAttempts: 3,
    }));

    return this.model.insertMany(otpData);
  }

  async getOTPsByStatus(status: OTPStatus, limit: number = 100): Promise<IOTP[]> {
    return this.find({ status }, { 
      sort: { createdAt: -1 }, 
      limit 
    });
  }

  async getExpiringOTPs(minutesUntilExpiration: number = 5): Promise<IOTP[]> {
    const expirationTime = new Date(Date.now() + minutesUntilExpiration * 60 * 1000);
    
    return this.find({
      status: OTPStatus.PENDING,
      expiresAt: { $lte: expirationTime, $gt: new Date() }
    });
  }
}