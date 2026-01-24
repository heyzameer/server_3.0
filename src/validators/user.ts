import Joi from 'joi';
import { phoneSchema, objectIdSchema } from '../validators/common';

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(1).max(50),
  phone: phoneSchema,
  profileImage: Joi.string().uri(),
  currentPassword: Joi.string(),
  newPassword: Joi.string().min(8).max(128),
});

export const addAddressSchema = Joi.object({
  street: Joi.string().min(1).max(200).required(),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  isDefault: Joi.boolean().default(false),
  streetNumber: Joi.string().min(1).max(50),
  buildingNumber: Joi.string().min(1).max(50),
  floorNumber: Joi.string().min(1).max(50),
  contactName: Joi.string().min(1).max(100).required(),
  contactPhone: phoneSchema.required(),
  type: Joi.string().valid('home', 'work', 'other'),
});

export const updateAddressSchema = Joi.object({
  street: Joi.string().min(1).max(200).required(),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  isDefault: Joi.boolean().default(false),
  streetNumber: Joi.string().min(1).max(50),
  buildingNumber: Joi.string().min(1).max(50),
  floorNumber: Joi.string().min(1).max(50),
  contactName: Joi.string().min(1).max(100).required(),
  contactPhone: phoneSchema.required(),
  type: Joi.string().valid('home', 'work', 'other'),
});

export const deleteAddressSchema = Joi.object({
  addressId: objectIdSchema,
});

export const updatePartnerInfoSchema = Joi.object({
  vehicleType: Joi.string(),
  vehicleNumber: Joi.string(),
  licenseNumber: Joi.string(),
  licenseExpiry: Joi.date().greater('now'),
  isOnline: Joi.boolean(),
});

export const getUsersSchema = Joi.object({
  role: Joi.string().valid('customer', 'PARTNER', 'admin'),
  isActive: Joi.boolean(),
  isVerified: Joi.boolean(),
  search: Joi.string().min(1),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});