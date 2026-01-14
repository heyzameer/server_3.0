// src/validators/partner.ts
import Joi from 'joi';
import { emailSchema, phoneSchema } from '../validators/common';

export const partnerRegistrationSchema = Joi.object({
  // Personal Information (flat)
  fullName: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Full name is required',
    'string.min': 'Full name must be at least 2 characters',
    'string.max': 'Full name cannot exceed 100 characters'
  }),

  email: emailSchema,

  phone: phoneSchema.required().messages({
    'any.required': 'Mobile number is required'
  }),

  dateOfBirth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date of birth must be in YYYY-MM-DD format',
    'any.required': 'Date of birth is required'
  }),


  // Banking Details (nested)
  bankingDetails: Joi.object({
    accountHolderName: Joi.string().min(2).max(100).required().messages({
      'string.empty': 'Account holder name is required',
      'string.min': 'Account holder name must be at least 2 characters'
    }),

    accountNumber: Joi.string()
      .pattern(/^\d{9,18}$/)
      .required()
      .messages({
        'string.pattern.base': 'Account number must be between 9-18 digits',
        'any.required': 'Account number is required'
      }),

    ifscCode: Joi.string()
      .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid IFSC code format. Example: SBIN0000123',
        'any.required': 'IFSC code is required'
      }),

    upiId: Joi.string()
      .pattern(/^[\w._-]{3,}@[a-zA-Z]{3,}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid UPI ID format. Example: username@upi'
      })
  }).required(),

  // Vehicle Documents (nested)
  vehicalDocuments: Joi.object({
    registrationNumber: Joi.string()
      .pattern(/^[A-Z]{2}\s?\d{2}\s?[A-Z]{2}\s?\d{4}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid registration number format. Example: KA 01 AB 1234',
        'any.required': 'Vehicle registration number is required'
      }),

    vehicleType: Joi.string().required().messages({
      'any.required': 'Vehicle type is required'
    }),


  }).required()
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

export const registerPartnerSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).required(),
  email: emailSchema,
  phone: phoneSchema,
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('partner').default('partner'),
});