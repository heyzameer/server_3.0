import { IWallet } from '../interfaces/IModel/IWallet';
import mongoose, { Schema } from 'mongoose';

const WalletSchema = new Schema<IWallet>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'ownerModel'
    },
    ownerModel: {
      type: String,
      required: true,
      enum: ['User', 'DeliveryPartner']
    },
    balance: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    isBlocked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema);
