import Joi from 'joi';
import { emailSchema, phoneSchema } from '../validators/common';
import { UserRole } from '../types';

export const registerSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).required(),
  email: emailSchema,
  phone: phoneSchema,
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.CUSTOMER),
  
});


export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: emailSchema,
});

export const resetPasswordSchema = Joi.object({
  email: emailSchema,
  otp: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

export const verifyOTPSchema = Joi.object({
  code: Joi.string().length(6).pattern(/^\d+$/).required(),
  type: Joi.string().valid('phone_verification', 'email_verification').required(),
});

export const requestOTPSchema = Joi.object({
  type: Joi.string().valid('phone_verification', 'email_verification').required(),
});

export const resendOTPSchema = Joi.object({
  type: Joi.string().valid('phone_verification', 'email_verification').required(),
  email: emailSchema,
});