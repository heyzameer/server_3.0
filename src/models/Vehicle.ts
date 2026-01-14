// src/models/vehicle.model.ts

import { IVehicle } from '../interfaces/IModel/IVehicle';
import mongoose, { Document, Schema } from 'mongoose';

export interface VehicleDocument extends IVehicle, Document {}

const VehicleSchema = new Schema<VehicleDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    maxWeight: {
      type: Schema.Types.Mixed,
    },
    pricePerKm: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const VehicleModel = mongoose.model<VehicleDocument>('Vehicle', VehicleSchema);
