import { IAddress } from '../interfaces/IModel/IAddress';
import mongoose, { Schema } from 'mongoose';

const addressSchema = new Schema<IAddress>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'ownerModel',
      index: true,
    },
    ownerModel: {
      type: String,
      required: true,
      enum: ['User', 'DeliveryPartner']
    },

    street: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    streetNumber: { type: String, maxlength: 50 },
    buildingNumber: { type: String, maxlength: 50 },
    floorNumber: { type: String, maxlength: 50 },
    contactName: { type: String, required: true, maxlength: 100 },
    contactPhone: { type: String, required: true, match: /^[+]?[1-9][\d]{0,15}$/ },
    latitude: { type: Number, },
    longitude: { type: Number, },
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'other'
    }
  },
  {
    timestamps: true
  }
);

addressSchema.index({ coordinates: '2dsphere' });

export const Address = mongoose.model<IAddress>('Address', addressSchema);

