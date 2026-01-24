import Joi from 'joi';
import { coordinatesSchema, objectIdSchema } from '../validators/common';

export const updateLocationSchema = Joi.object({
  coordinates: coordinatesSchema.required(),
  heading: Joi.number().min(0).max(360),
  speed: Joi.number().min(0),
  address: Joi.string().max(500),
  isOnline: Joi.boolean().default(true),
  batteryLevel: Joi.number().integer().min(0).max(100),
  networkType: Joi.string().valid('wifi', '4g', '3g', '2g', 'unknown'),
  orderId: objectIdSchema,
});

export const getNearbyPartnersSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(1).max(50).default(10),
});

export const getLocationHistorySchema = Joi.object({
  userId: objectIdSchema,
  fromDate: Joi.date(),
  toDate: Joi.date(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});