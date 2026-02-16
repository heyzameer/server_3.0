import { Document, Types } from 'mongoose';

export interface IRating extends Document {
  ratedByModel: 'User' | 'Partner';
  ratedById: Types.ObjectId;

  ratedForModel: 'User' | 'Partner';
  ratedForId: Types.ObjectId;

  orderId: string;
  rating: number;
  feedback?: string;
  quickReviews?: string[];
  createdAt: Date;
}
