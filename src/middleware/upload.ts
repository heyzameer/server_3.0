// src/middleware/upload.ts
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import { Request } from 'express';
import config from '../config';
import { generateRandomString } from '../utils/helpers';

// Initialize S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

// S3 storage configuration
const s3Storage = multerS3({
  s3: s3Client,
  bucket: config.aws.s3BucketName,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, {
      fieldName: file.fieldname,
      originalName: file.originalname,
      uploadedBy: req.user?.userId || 'anonymous', // if you have user info in req
      uploadedAt: new Date().toISOString(),
    });
  },
  key: (req: Request, file: Express.Multer.File, cb) => {
    let s3Key = '';

    // Folder structure based on route and field name
    if (req.baseUrl?.includes('partner') || req.route?.path?.includes('partner')) {
      s3Key = 'partners/';
      if (file.fieldname === 'profilePicture') {
        s3Key += 'profiles/';
      } else if (file.fieldname.startsWith('aadhar')) {
        s3Key += 'identity/';
      } else {
        s3Key += 'misc/';
      }
    } else if (req.baseUrl?.includes('user') || req.route?.path?.includes('user')) {
      s3Key = 'users/';
      if (file.fieldname === 'profilePicture' || file.fieldname === 'profileImage') {
        s3Key += 'profiles/';
      } else {
        s3Key += 'misc/';
      }
    } else if (req.baseUrl?.includes('property') || req.route?.path?.includes('property') || req.route?.path?.includes('prop')) {
      s3Key = 'properties/';
      if (file.fieldname === 'images' || file.fieldname === 'coverImage') {
        s3Key += 'images/';
      } else if (['ownershipProof', 'ownerKYC'].includes(file.fieldname)) {
        s3Key += 'ownership/';
      } else if (['gstCertificate', 'panCard'].includes(file.fieldname)) {
        s3Key += 'tax/';
      } else {
        s3Key += 'misc/';
      }
    } else {
      s3Key = 'uploads/';
    }

    // Generate unique filename
    const uniqueSuffix = generateRandomString(16);
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${uniqueSuffix}${extension}`;

    cb(null, s3Key + filename);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const isPartner = req.baseUrl?.includes('partner') || req.route?.path?.includes('partner');
  const isUser = req.baseUrl?.includes('user') || req.route?.path?.includes('user');
  const isProperty = req.baseUrl?.includes('property') || req.route?.path?.includes('property') || req.route?.path?.includes('prop');

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const allowedDocTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (isPartner) {
    const partnerAllowedFields: Record<string, string[]> = {
      profilePicture: allowedImageTypes,
      aadharFront: allowedImageTypes,
      aadharBack: allowedImageTypes
    };

    const allowedTypes = partnerAllowedFields[file.fieldname];
    if (!allowedTypes) return cb(new Error(`Unexpected field for partner: ${file.fieldname}`), false);
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid type for ${file.fieldname}. Allowed: ${allowedTypes.join(', ')}`), false);
    }
    return cb(null, true);
  }

  if (isUser) {
    if (['profilePicture', 'profileImage'].includes(file.fieldname)) {
      if (!allowedImageTypes.includes(file.mimetype)) {
        return cb(new Error(`Invalid type for ${file.fieldname}. Allowed: ${allowedImageTypes.join(', ')}`), false);
      }
      return cb(null, true);
    }
    return cb(new Error(`Unexpected field for user: ${file.fieldname}`), false);
  }

  if (isProperty) {
    const propertyAllowedFields: Record<string, string[]> = {
      images: allowedImageTypes,
      coverImage: allowedImageTypes,
      ownershipProof: allowedDocTypes,
      ownerKYC: allowedDocTypes,
      gstCertificate: allowedDocTypes,
      panCard: allowedDocTypes
    };

    const allowedTypes = propertyAllowedFields[file.fieldname];
    if (!allowedTypes) return cb(new Error(`Unexpected field for property: ${file.fieldname}`), false);
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid type for ${file.fieldname}. Allowed: ${allowedTypes.join(', ')}`), false);
    }
    return cb(null, true);
  }

  // Default filter
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

export const upload = multer({
  storage: s3Storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10
  },
});

// Specific middleware for partner registration
export const partnerUpload = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 }
]);

export const userUpload = upload.fields([
  { name: 'profileImage', maxCount: 1 }
]);

export const propertyOwnershipUpload = upload.fields([
  { name: 'ownershipProof', maxCount: 1 },
  { name: 'ownerKYC', maxCount: 1 }
]);

export const propertyTaxUpload = upload.fields([
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'panCard', maxCount: 1 }
]);

export const propertyImagesUpload = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);

// Single file upload (for other routes)
export const singleUpload = upload.single('file');

// Multiple files upload (for other routes)
export const multipleUpload = upload.array('files', 5);

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  console.log("file error ", error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const sizeInMB = (config.upload.maxFileSize / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        success: false,
        message: `File size too large. Maximum size is ${sizeInMB}MB`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
  }

  // Handle S3 specific errors
  if (error.name === 'S3Error' || error.code?.startsWith('S3')) {
    return res.status(500).json({
      success: false,
      message: 'File upload failed. Please try again.'
    });
  }

  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

// Helper function to process uploaded files for partner registration
export const processPartnerFiles = (files: { [fieldname: string]: Express.Multer.File[] }): Express.Multer.File[] => {
  const fileArray: Express.Multer.File[] = [];

  Object.keys(files).forEach(fieldname => {
    files[fieldname].forEach(file => {
      file.fieldname = fieldname; // Ensure fieldname is preserved
      fileArray.push(file);
    });
  });

  return fileArray;
};

// Helper function to generate S3 URL for uploaded file
export const getS3FileUrl = (key: string): string => {
  return `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
};

// Helper function to delete file from S3
export const deleteS3File = async (key: string): Promise<boolean> => {
  try {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3BucketName,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting S3 file:', error);
    return false;
  }
};

// Helper function to generate signed URL for S3 file
export const getSignedFileUrl = async (keyOrUrl: string, expiresIn: number = config.signedUrlExpiration): Promise<string> => {
  try {
    // Return empty string if no key/URL provided
    if (!keyOrUrl || keyOrUrl.trim() === '') {
      return '';
    }

    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    // Extract key if a full URL is provided
    let key = keyOrUrl;
    if (keyOrUrl.startsWith('http')) {
      const urlParts = keyOrUrl.split('.amazonaws.com/');
      if (urlParts.length > 1) {
        key = urlParts[1].split('?')[0]; // Strip query parameters
      }
    }

    const command = new GetObjectCommand({
      Bucket: config.aws.s3BucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return keyOrUrl; // Return original if failure
  }
};

export { s3Client };
