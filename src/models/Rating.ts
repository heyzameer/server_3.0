import mongoose, { Schema } from 'mongoose';
import { IRating } from '../interfaces/IModel/IRating';

const RatingSchema = new Schema<IRating>(
  {
    ratedByModel: {
      type: String,
      required: true,
      enum: ['User', 'DeliveryPartner'],
    },
    ratedById: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'ratedByModel',
      index: true,
    },
    ratedForModel: {
      type: String,
      required: true,
      enum: ['User', 'DeliveryPartner'],
    },
    ratedForId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'ratedForModel',
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
    },
    quickReviews: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        ret.ratingId = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Index for quick lookups
RatingSchema.index({ ratedForId: 1, createdAt: -1 });

export const RatingModel = mongoose.model<IRating>('Rating', RatingSchema);
