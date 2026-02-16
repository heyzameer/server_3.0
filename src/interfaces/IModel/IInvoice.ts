import { Document, Types } from 'mongoose';

export interface IInvoice extends Document {
  orderId: Types.ObjectId;
  ownerId: Types.ObjectId;
  ownerModel: 'User' | 'Partner';
  amount: number;
  tax: number;
  totalAmount: number;
  issuedAt: Date;
  paymentMethod: 'wallet' | 'card' | 'cash' | 'upi';
  status: 'paid' | 'unpaid';
}
