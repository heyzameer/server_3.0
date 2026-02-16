import * as yup from 'yup';

/**
 * Validator for GET /admin/properties query parameters
 */
export const getPropertiesQuerySchema = yup.object().shape({
    page: yup
        .number()
        .optional()
        .typeError('Page must be a number')
        .min(1, 'Page must be at least 1')
        .default(1),
    limit: yup
        .number()
        .optional()
        .typeError('Limit must be a number')
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit cannot exceed 100')
        .default(10),
    status: yup
        .string()
        .optional()
        .oneOf(
            ['pending', 'verified', 'rejected', 'suspended'],
            'Status must be one of: pending, verified, rejected, suspended'
        ),
    verificationStatus: yup
        .string()
        .optional()
        .oneOf(
            ['pending', 'verified', 'rejected', 'suspended'],
            'Verification status must be one of: pending, verified, rejected, suspended'
        ),
    propertyType: yup
        .string()
        .optional()
        .oneOf(
            ['hotel', 'homestay', 'apartment', 'resort', 'villa'],
            'Property type must be one of: hotel, homestay, apartment, resort, villa'
        ),
    city: yup
        .string()
        .optional()
        .typeError('City must be a string')
        .trim()
        .min(2, 'City name must be at least 2 characters')
        .max(100, 'City name cannot exceed 100 characters'),
    isActive: yup
        .boolean()
        .optional()
        .typeError('isActive must be a boolean'),
    isVerified: yup
        .boolean()
        .optional()
        .typeError('isVerified must be a boolean'),
    search: yup
        .string()
        .optional()
        .typeError('Search must be a string')
        .trim()
        .min(2, 'Search term must be at least 2 characters')
        .max(200, 'Search term cannot exceed 200 characters'),
});

/**
 * Validator for PATCH /admin/properties/:id/verify
 */
export const verifyPropertySchema = yup.object().shape({
    status: yup
        .string()
        .required('Status is required')
        .oneOf(
            ['verified', 'rejected', 'suspended'],
            'Status must be one of: verified, rejected, suspended'
        ),
    rejectionReason: yup
        .string()
        .when('status', {
            is: 'rejected',
            then: (schema) =>
                schema
                    .required('Rejection reason is required when status is rejected')
                    .min(10, 'Rejection reason must be at least 10 characters')
                    .max(500, 'Rejection reason cannot exceed 500 characters'),
            otherwise: (schema) => schema.optional(),
        }),
});

/**
 * Validator for PATCH /admin/properties/:id/document-status
 */
export const updatePropertyDocumentStatusSchema = yup.object().shape({
    section: yup
        .string()
        .required('Section is required')
        .oneOf(
            ['ownership', 'tax', 'banking'],
            'Section must be one of: ownership, tax, banking'
        ),
    status: yup
        .string()
        .required('Status is required')
        .oneOf(
            ['approved', 'rejected'],
            'Status must be one of: approved, rejected'
        ),
    rejectionReason: yup
        .string()
        .when('status', {
            is: 'rejected',
            then: (schema) =>
                schema
                    .required('Rejection reason is required when status is rejected')
                    .min(10, 'Rejection reason must be at least 10 characters')
                    .max(500, 'Rejection reason cannot exceed 500 characters'),
            otherwise: (schema) => schema.optional(),
        }),
});

/**
 * Validator for POST /partner/register-prop
 */
export const propertyRegistrationSchema = yup.object().shape({
    propertyName: yup.string().required('Property name is required'),
    propertyType: yup
        .string()
        .required('Property type is required')
        .oneOf(['hotel', 'homestay', 'apartment', 'resort', 'villa']),
    description: yup
        .string()
        .required('Description is required')
        .min(20, 'Description must be at least 20 characters'),
    amenities: yup
        .array()
        .of(yup.string())
        .required('Amenities are required')
        .min(1, 'At least one amenity is required'),
    address: yup
        .object()
        .shape({
            street: yup.string().required('Street is required'),
            city: yup.string().required('City is required'),
            state: yup.string().required('State is required'),
            pincode: yup.string().required('Pincode is required'),
            country: yup.string().optional().default('India'),
        })
        .required('Address is required'),
    location: yup
        .object()
        .shape({
            type: yup.string().optional().oneOf(['Point']).default('Point'),
            coordinates: yup.array().of(yup.number()).length(2).required('Coordinates are required'),
        })
        .required('Location is required'),
    // pricePerNight, maxGuests, totalRooms, availableRooms moved to Room model
    ownershipProof: yup.string().optional().url(),
    ownerKYC: yup.string().optional().url(),
    gstNumber: yup.string().optional(),
    gstCertificate: yup.string().optional().url(),
    panNumber: yup.string().optional(),
    panCard: yup.string().optional().url(),
    accountHolderName: yup.string().optional(),
    accountNumber: yup.string().optional(),
    ifscCode: yup.string().optional(),
    upiId: yup.string().optional().email(),
    images: yup.array().of(yup.string().url()).optional(),
    coverImage: yup.string().optional().url(),
});
