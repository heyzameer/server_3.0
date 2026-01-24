import { ILocation } from '../interfaces/IModel/ILocation';
// import { LocationCoordinates } from '../types';
import mongoose, { Schema, Model } from 'mongoose';



const locationSchema = new Schema<ILocation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    coordinates: {
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 },
      accuracy: { type: Number, min: 0 },
      timestamp: { type: Date, default: Date.now },
    },
    heading: {
      type: Number,
      min: 0,
      max: 360,
    },
    speed: {
      type: Number,
      min: 0,
    },
    address: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    networkType: {
      type: String,
      enum: ['wifi', '4g', '3g', '2g', 'unknown'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better performance
locationSchema.index({ userId: 1 });
locationSchema.index({ orderId: 1 });
locationSchema.index({ isOnline: 1 });
locationSchema.index({ coordinates: '2dsphere' });
locationSchema.index({ createdAt: -1 });

// Compound index for efficient queries
locationSchema.index({ userId: 1, createdAt: -1 });

// TTL index to automatically delete old location data (keep for 30 days)
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static method to find nearby partners
locationSchema.statics.findNearbyPartners = function (
  latitude: number,
  longitude: number,
  radiusKm: number = 10
) {
  return this.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        distanceField: 'distance',
        maxDistance: radiusKm * 1000, // Convert to meters
        spherical: true,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $match: {
        'user.role': 'partner',
        'user.isActive': true,
        'user.partnerInfo.isOnline': true,
        isOnline: true,
      },
    },
    {
      $sort: { distance: 1 },
    },
  ]);
};

// Static method to get latest location for user
locationSchema.statics.getLatestLocation = function (userId: string) {
  return this.findOne({ userId }).sort({ createdAt: -1 });
};

// Instance method to calculate distance from another location
locationSchema.methods.distanceFrom = function (
  latitude: number,
  longitude: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(latitude - this.coordinates.latitude);
  const dLon = toRad(longitude - this.coordinates.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(this.coordinates.latitude)) *
    Math.cos(toRad(latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const Location: Model<ILocation> = mongoose.model<ILocation>('Location', locationSchema);