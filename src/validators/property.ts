import Joi from 'joi';

/**
 * Validator for GET /admin/properties query parameters
 */
export const getPropertiesQuerySchema = Joi.object({
    page: Joi
        .number()
        .optional()
        .min(1)
        .default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.min': 'Page must be at least 1'
        }),
    limit: Joi
        .number()
        .optional()
        .min(1)
        .max(100)
        .default(10)
        .messages({
            'number.base': 'Limit must be a number',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        }),
    status: Joi
        .string()
        .optional()
        .valid('pending', 'verified', 'rejected', 'suspended')
        .messages({
            'any.only': 'Status must be one of: pending, verified, rejected, suspended'
        }),
    verificationStatus: Joi
        .string()
        .optional()
        .valid('pending', 'verified', 'rejected', 'suspended')
        .messages({
            'any.only': 'Verification status must be one of: pending, verified, rejected, suspended'
        }),
    propertyType: Joi
        .string()
        .optional()
        .valid('hotel', 'homestay', 'apartment', 'resort', 'villa')
        .messages({
            'any.only': 'Property type must be one of: hotel, homestay, apartment, resort, villa'
        }),
    city: Joi
        .string()
        .optional()
        .trim()
        .min(2)
        .max(100)
        .messages({
            'string.base': 'City must be a string',
            'string.min': 'City name must be at least 2 characters',
            'string.max': 'City name cannot exceed 100 characters'
        }),
    isActive: Joi
        .boolean()
        .optional()
        .messages({
            'boolean.base': 'isActive must be a boolean'
        }),
    isVerified: Joi
        .boolean()
        .optional()
        .messages({
            'boolean.base': 'isVerified must be a boolean'
        }),
    search: Joi
        .string()
        .optional()
        .trim()
        .min(2)
        .max(200)
        .messages({
            'string.base': 'Search must be a string',
            'string.min': 'Search term must be at least 2 characters',
            'string.max': 'Search term cannot exceed 200 characters'
        }),
});

/**
 * Validator for PATCH /admin/properties/:id/verify
 */
export const verifyPropertySchema = Joi.object({
    status: Joi
        .string()
        .required()
        .valid('verified', 'rejected', 'suspended')
        .messages({
            'any.required': 'Status is required',
            'any.only': 'Status must be one of: verified, rejected, suspended'
        }),
    rejectionReason: Joi
        .string()
        .when('status', {
            is: 'rejected',
            then: Joi.string()
                .required()
                .min(10)
                .max(500)
                .messages({
                    'any.required': 'Rejection reason is required when status is rejected',
                    'string.min': 'Rejection reason must be at least 10 characters',
                    'string.max': 'Rejection reason cannot exceed 500 characters'
                }),
            otherwise: Joi.string().optional(),
        }),
});

/**
 * Validator for PATCH /admin/properties/:id/document-status
 */
export const updatePropertyDocumentStatusSchema = Joi.object({
    section: Joi
        .string()
        .required()
        .valid('ownership', 'tax', 'banking')
        .messages({
            'any.required': 'Section is required',
            'any.only': 'Section must be one of: ownership, tax, banking'
        }),
    status: Joi
        .string()
        .required()
        .valid('approved', 'rejected')
        .messages({
            'any.required': 'Status is required',
            'any.only': 'Status must be one of: approved, rejected'
        }),
    rejectionReason: Joi
        .string()
        .when('status', {
            is: 'rejected',
            then: Joi.string()
                .required()
                .min(10)
                .max(500)
                .messages({
                    'any.required': 'Rejection reason is required when status is rejected',
                    'string.min': 'Rejection reason must be at least 10 characters',
                    'string.max': 'Rejection reason cannot exceed 500 characters'
                }),
            otherwise: Joi.string().optional(),
        }),
});

/**
 * Validator for POST /partner/register-prop
 */
export const propertyRegistrationSchema = Joi.object({
    propertyName: Joi.string().required().messages({
        'any.required': 'Property name is required'
    }),
    propertyType: Joi
        .string()
        .required()
        .valid('hotel', 'homestay', 'apartment', 'resort', 'villa')
        .messages({
            'any.required': 'Property type is required',
            'any.only': 'Property type must be one of: hotel, homestay, apartment, resort, villa'
        }),
    description: Joi
        .string()
        .required()
        .min(20)
        .messages({
            'any.required': 'Description is required',
            'string.min': 'Description must be at least 20 characters'
        }),
    amenities: Joi
        .array()
        .items(Joi.string())
        .required()
        .min(1)
        .messages({
            'any.required': 'Amenities are required',
            'array.min': 'At least one amenity is required'
        }),
    address: Joi
        .object({
            street: Joi.string().required().messages({ 'any.required': 'Street is required' }),
            city: Joi.string().required().messages({ 'any.required': 'City is required' }),
            state: Joi.string().required().messages({ 'any.required': 'State is required' }),
            pincode: Joi.string().required().messages({ 'any.required': 'Pincode is required' }),
            country: Joi.string().optional().default('India'),
        })
        .required()
        .messages({
            'any.required': 'Address is required'
        }),
    location: Joi
        .object({
            type: Joi.string().optional().valid('Point').default('Point'),
            coordinates: Joi.array().items(Joi.number()).length(2).required().messages({
                'any.required': 'Coordinates are required',
                'array.length': 'Coordinates must have exactly 2 values'
            }),
        })
        .required()
        .messages({
            'any.required': 'Location is required'
        }),
    // pricePerNight, maxGuests, totalRooms, availableRooms moved to Room model
    ownershipProof: Joi.string().optional().uri(),
    ownerKYC: Joi.string().optional().uri(),
    gstNumber: Joi.string().optional(),
    gstCertificate: Joi.string().optional().uri(),
    panNumber: Joi.string().optional(),
    panCard: Joi.string().optional().uri(),
    accountHolderName: Joi.string().optional(),
    accountNumber: Joi.string().optional(),
    ifscCode: Joi.string().optional(),
    upiId: Joi.string().optional().email(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    coverImage: Joi.string().optional().uri(),
});
