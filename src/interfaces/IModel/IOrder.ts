// interfaces/IModel/IOrder.ts
import { Address, OrderStatus, PaymentMethod, PaymentStatus } from '../../types';
import { Document, Types } from 'mongoose';

export interface IOrder extends Document {
  userId: Types.ObjectId;
  partnerId?: Types.ObjectId;
  checkInAddress: Address;
  checkOutAddress: Address;
  bookingType: 'standard' | 'premium' | 'luxury' | 'vip';
  scheduledCheckInTime?: Date;
  scheduledCheckOutTime?: Date;
  vehicleId: Types.ObjectId;
  status: OrderStatus.PENDING | OrderStatus.CONFIRMED | OrderStatus.PICKED_UP | OrderStatus.IN_TRANSIT | OrderStatus.OUT_FOR_SERVICE | OrderStatus.COMPLETED | OrderStatus.CANCELLED | OrderStatus.RETURNED;
  paymentStatus: PaymentStatus.COMPLETED | PaymentStatus.PENDING | PaymentStatus.FAILED | PaymentStatus.REFUNDED;
  distanceKm: number;
  pricing: number;
  paymentMethod: PaymentMethod.CARD | PaymentMethod.CASH | PaymentMethod.DIGITAL_WALLET | PaymentMethod.UPI;
  estimatedCheckOutTime: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
