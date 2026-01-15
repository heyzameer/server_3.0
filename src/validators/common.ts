import Joi from 'joi';
import { validateObjectId, validateEmail, validatePhone, validateCoordinates } from '../utils/validation';

export const objectIdSchema = Joi.string().custom(validateObjectId).required();

export const emailSchema = Joi.string().email().custom(validateEmail).required();

export const phoneSchema = Joi.string().custom(validatePhone).required();

export const coordinatesSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0),
  timestamp: Joi.date(),
}).custom(validateCoordinates);

export const addressSchema = Joi.object({
  street: Joi.string().min(1).max(200).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  isDefault: Joi.boolean().default(false),
  streetNumber: Joi.string().min(1).max(50),
  buildingNumber: Joi.string().min(1).max(50),
  floorNumber: Joi.string().min(1).max(50),
  contactName: Joi.string().min(1).max(100).required(),
  contactPhone: phoneSchema.required(),
  type: Joi.string().valid('home', 'work', 'other'),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});