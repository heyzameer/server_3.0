// models/order.model.ts
import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../interfaces/IModel/IOrder';
import { OrderStatus, PaymentStatus } from '../types';

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    pickupAddress: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    deliveryAddress: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    status: {
      type: String,
      enum: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED],
      default: OrderStatus.PENDING
    },
    paymentStatus: {
      type: String,
      enum: [PaymentStatus.COMPLETED, PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.REFUNDED],
      default: PaymentStatus.PENDING
    },
    distanceKm: { type: Number, required: true },
    pricing: { type: Number, required: true },
    estimatedDeliveryTime: { type: Date },
    deliveredAt: { type: Date }
  },
  {
    timestamps: true
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
