import Joi from 'joi';
import { objectIdSchema } from './common';

export const idParamSchema = Joi.object({
  id: objectIdSchema,
});

export const userIdParamSchema = Joi.object({
  userId: objectIdSchema,
});

export const orderIdParamSchema = Joi.object({
  orderId: objectIdSchema,
});

export const orderNumberParamSchema = Joi.object({
  orderNumber: Joi.string().pattern(/^ORD-\d+-[A-Z0-9]+$/).required(),
});