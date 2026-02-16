import { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
  userId: Schema.Types.ObjectId;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    altitude?: number;
  };
  isOnline: boolean;
  batteryLevel?: number;
  networkType?: string;
  orderId?: string;
  timestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}