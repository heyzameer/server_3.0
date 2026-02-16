// models/order.model.ts
import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../interfaces/IModel/IOrder';
import { OrderStatus, PaymentStatus } from '../types';

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner' },
    checkInAddress: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    checkOutAddress: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    status: {
      type: String,
      enum: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_SERVICE, OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.RETURNED],
      default: OrderStatus.PENDING
    },
    paymentStatus: {
      type: String,
      enum: [PaymentStatus.COMPLETED, PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.REFUNDED],
      default: PaymentStatus.PENDING
    },
    distanceKm: { type: Number, required: true },
    pricing: { type: Number, required: true },
    estimatedCheckOutTime: { type: Date },
    completedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
