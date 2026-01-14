import { Document, Types } from 'mongoose';

export interface IRating extends Document {
  ratedByModel: 'User' | 'DeliveryPartner';
  ratedById: Types.ObjectId;

  ratedForModel: 'User' | 'DeliveryPartner';
  ratedForId: Types.ObjectId;

  orderId: string;
  rating: number;
  feedback?: string;
  quickReviews?: string[];
  createdAt: Date;
}
