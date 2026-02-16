import mongoose, { Schema } from 'mongoose';
import { ILocation } from '../interfaces/IModel/ILocation';

const locationSchema = new Schema<ILocation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    heading: { type: Number },
    speed: { type: Number },
    altitude: { type: Number }
  },
  isOnline: { type: Boolean, default: false },
  batteryLevel: { type: Number },
  networkType: { type: String },
  orderId: { type: String, index: true },
  timestamp: { type: Date }
}, {
  timestamps: true
});

locationSchema.index({ 'coordinates': '2dsphere' });
locationSchema.index({ createdAt: 1 });

export const Location = mongoose.model<ILocation>('Location', locationSchema);