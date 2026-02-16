import { Document, Types } from 'mongoose';

export interface IWallet extends Document {
  ownerId: Types.ObjectId;               // dynamic reference ID
  ownerModel: 'User' | 'Partner'; // dynamic model name
  balance: number;
  currency: string;
  isBlocked: boolean;
}
