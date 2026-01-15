import Joi from 'joi';
import { addressSchema, objectIdSchema } from '../validators/common';
import { DeliveryType, PaymentMethod, OrderStatus } from '../types';

const orderItemSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(500),
  category: Joi.string().min(1).max(100).required(),
  quantity: Joi.number().integer().min(1).required(),
  weight: Joi.number().min(0),
  dimensions: Joi.object({
    length: Joi.number().min(0).required(),
    width: Joi.number().min(0).required(),
    height: Joi.number().min(0).required(),
  }),
  value: Joi.number().min(0).required(),
  fragile: Joi.boolean().default(false),
  specialInstructions: Joi.string().max(500),
});

export const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  pickupAddress: addressSchema.required(),
  deliveryAddress: addressSchema.required(),
  deliveryType: Joi.string().valid(...Object.values(DeliveryType)).default(DeliveryType.STANDARD),
  scheduledPickupTime: Joi.date().greater('now'),
  scheduledDeliveryTime: Joi.date().greater('now'),
  paymentMethod: Joi.string().valid(...Object.values(PaymentMethod)).required(),
  specialInstructions: Joi.string().max(500),
  customerNotes: Joi.string().max(500),
});

export const updateOrderSchema = Joi.object({
  orderId: objectIdSchema,
  status: Joi.string().valid(...Object.values(OrderStatus)),
  deliveryPartnerId: objectIdSchema,
  scheduledPickupTime: Joi.date().greater('now'),
  scheduledDeliveryTime: Joi.date().greater('now'),
  actualPickupTime: Joi.date(),
  actualDeliveryTime: Joi.date(),
  estimatedDeliveryTime: Joi.date(),
  deliveryPartnerNotes: Joi.string().max(500),
  cancellationReason: Joi.string().max(500),
});

export const assignDeliveryPartnerSchema = Joi.object({
  orderId: objectIdSchema,
  deliveryPartnerId: objectIdSchema,
});

export const verifyOTPSchema = Joi.object({
  orderId: objectIdSchema,
  code: Joi.string().length(6).pattern(/^\d+$/).required(),
  type: Joi.string().valid('pickup', 'delivery').required(),
});

export const rateOrderSchema = Joi.object({
  orderId: objectIdSchema,
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500),
  ratingType: Joi.string().valid('customer', 'PARTNER').required(),
});

export const getOrdersSchema = Joi.object({
  status: Joi.string().valid(...Object.values(OrderStatus)),
  customerId: objectIdSchema,
  deliveryPartnerId: objectIdSchema,
  deliveryType: Joi.string().valid(...Object.values(DeliveryType)),
  fromDate: Joi.date(),
  toDate: Joi.date(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const cancelOrderSchema = Joi.object({
  orderId: objectIdSchema,
  reason: Joi.string().min(1).max(500).required(),
});