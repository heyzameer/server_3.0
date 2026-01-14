// models/invoice.model.ts
import mongoose, { Schema } from 'mongoose';
import { IInvoice } from '../interfaces/IModel/IInvoice';

const InvoiceSchema = new Schema<IInvoice>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
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
    amount: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'card', 'cash', 'upi'],
      required: true
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid'
    }
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
