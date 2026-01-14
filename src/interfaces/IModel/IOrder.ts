// interfaces/IModel/IOrder.ts
import { Address, OrderStatus, PaymentMethod, PaymentStatus } from '../../types';
import { Document, Types } from 'mongoose';

export interface IOrder extends Document {
  userId: Types.ObjectId;
  deliveryPartnerId?: Types.ObjectId;
  pickupAddress: Address;
  deliveryAddress: Address;
  deliveryType: 'standard' | 'express' | 'same_day' | 'scheduled';
  scheduledPickupTime?: Date;
  scheduledDeliveryTime?: Date;
  vehicleId: Types.ObjectId;
  status: OrderStatus.PENDING | OrderStatus.CONFIRMED | OrderStatus.PICKED_UP | OrderStatus.IN_TRANSIT | OrderStatus.OUT_FOR_DELIVERY | OrderStatus.DELIVERED | OrderStatus.CANCELLED | OrderStatus.RETURNED;
  paymentStatus: PaymentStatus.COMPLETED | PaymentStatus.PENDING | PaymentStatus.FAILED | PaymentStatus.REFUNDED;
  distanceKm: number;
  pricing: number;
  paymentMethod: PaymentMethod.CARD | PaymentMethod.CASH | PaymentMethod.DIGITAL_WALLET | PaymentMethod.UPI;
  estimatedDeliveryTime: Date;
  deliveredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
