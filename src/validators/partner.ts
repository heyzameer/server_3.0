// src/validators/partner.ts
import Joi from 'joi';
import { emailSchema, phoneSchema } from '../validators/common';

export const partnerRegistrationSchema = Joi.object({
  // Personal Information
  fullName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Full name is required',
    'string.min': 'Full name must be at least 2 characters',
    'string.max': 'Full name cannot exceed 100 characters'
  }),


  email: emailSchema,

  phone: phoneSchema.required().messages({
    'any.required': 'Mobile number is required'
  }),

  dateOfBirth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Date of birth must be in YYYY-MM-DD format'
  }),

  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required'
  })
});

// Aadhaar upload validation (for separate document upload endpoint)
export const aadhaarUploadSchema = Joi.object({
  aadharFront: Joi.string().required().messages({
    'any.required': 'Aadhaar front image is required'
  }),
  aadharBack: Joi.string().required().messages({
    'any.required': 'Aadhaar back image is required'
  })
});

export const registerPartnerSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).required(),
  email: emailSchema,
  phone: phoneSchema,
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('partner').default('partner'),
});

export const partnerLoginOtpSchema = Joi.object({
  email: emailSchema
});

export const partnerVerifyOtpSchema = Joi.object({
  email: emailSchema,
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
    'any.required': 'OTP is required'
  })
});

export const partnerRefreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional() // Can come from cookies
});

export const partnerAdharSchema = Joi.object({
  email: emailSchema.required().messages({
    'any.required': 'Email is required for verification'
  })
});

