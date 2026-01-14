import { OTPStatus, OTPType } from "../../types";
import mongoose, { Document, Model } from "mongoose";

export interface IOTP extends Document {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  type: OTPType;
  code: string;
  status: OTPStatus;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  verify(inputCode: string): { success: boolean; message: string };
  isExpired(): boolean;
  isValid(): boolean;
}


export interface IOTPModel extends Model<IOTP> {
  findValidOTP(userId: string, type: OTPType, code: string): Promise<IOTP | null>;
  cleanupExpired(): Promise<any>;
}