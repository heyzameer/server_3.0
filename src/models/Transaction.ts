import mongoose, { Schema } from 'mongoose';
import { ITransaction } from '../interfaces/IModel/ITransaction';

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    userType: {
      type: String,
      required: true,
      enum: ['User', 'DeliveryPartner'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'userType', // Dynamic reference
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ userId: 1, userType: 1 });
TransactionSchema.index({ createdAt: -1 });

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
