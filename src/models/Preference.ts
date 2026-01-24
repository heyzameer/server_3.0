import { IPreference } from '../interfaces/IModel/IPreference';
import mongoose, { Schema } from 'mongoose';

const preferenceSchema = new Schema<IPreference>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'ownerModel',
      unique: true,
      index: true
    },
    ownerModel: {
      type: String,
      required: true,
      enum: ['User', 'Partner']
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
  },
  {
    timestamps: true,
  }
);

export const Preference = mongoose.model<IPreference>('Preference', preferenceSchema);
