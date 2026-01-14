import { Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  userType: 'User' | 'DeliveryPartner';
  userId: Types.ObjectId;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}
