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
      uploadedBy: req.user?.userId|| 'anonymous', // if you have user info in req
      uploadedAt: new Date().toISOString(),
    });
  },
  key: (req: Request, file: Express.Multer.File, cb) => {
    // Generate S3 key (path) based on route and file type
    let s3Key = '';
    
    if (req.route?.path?.includes('partner') || req.baseUrl?.includes('partner')) {
      // Partner-specific folder structure
      s3Key = 'partners/';
      
      if (file.fieldname === 'profilePicture') {
        s3Key += 'profiles/';
      } else if (file.fieldname.includes('aadhar') || file.fieldname.includes('pan') || file.fieldname.includes('license')) {
        s3Key += 'documents/';
      } else if (file.fieldname.includes('insurance') || file.fieldname.includes('pollution')) {
        s3Key += 'vehicle-docs/';
      } else {
        s3Key += 'misc/';
      }
      } else if (req.route?.path?.includes('user') || req.baseUrl?.includes('user')) {
    s3Key = 'users/';
    if (file.fieldname === 'profileImage') {
      s3Key += 'profiles/';
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
  // Check if it's a partner registration route
  if (req.route?.path?.includes('partner') || req.baseUrl?.includes('partner')) {
    // Partner-specific file validation
    const partnerAllowedTypes: Record<string, string[]> = {
      profilePicture: ['image/jpeg', 'image/jpg', 'image/png'],
      aadharFront: ['image/jpeg', 'image/jpg', 'image/png'],
      aadharBack: ['image/jpeg', 'image/jpg', 'image/png'],
      panFront: ['image/jpeg', 'image/jpg', 'image/png'],
      panBack: ['image/jpeg', 'image/jpg', 'image/png'],
      licenseFront: ['image/jpeg', 'image/jpg', 'image/png'],
      licenseBack: ['image/jpeg', 'image/jpg', 'image/png'],
      insuranceDocument: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
      pollutionDocument: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    };

    const fieldAllowedTypes = partnerAllowedTypes[file.fieldname];
    
    if (!fieldAllowedTypes) {
      return cb(new Error(`Unexpected field: ${file.fieldname}`), false);
    }
    
    if (!fieldAllowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${fieldAllowedTypes.join(', ')}`), false);
    }
    
    cb(null, true);
  }
    else if (req.route?.path?.includes('user') || req.baseUrl?.includes('user')) {
    // ✅ User-specific validation
    const userAllowedTypes: Record<string, string[]> = {
      profileImage: ['image/jpeg', 'image/jpg', 'image/png'],
    };

    const fieldAllowedTypes = userAllowedTypes[file.fieldname];
    if (!fieldAllowedTypes) return cb(new Error(`Unexpected field: ${file.fieldname}`), false);
    if (!fieldAllowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${fieldAllowedTypes.join(', ')}`), false);
    }
    cb(null, true);
  } else {
    // Default file validation for other routes
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
};

export const upload = multer({
  storage: s3Storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Allow up to 10 files for partner registration
  },
});

// Specific middleware for partner registration
export const partnerUpload = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'aadharFront', maxCount: 1 },
  { name: 'aadharBack', maxCount: 1 },
  { name: 'panFront', maxCount: 1 },
  { name: 'panBack', maxCount: 1 },
  { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 },
  { name: 'insuranceDocument', maxCount: 1 },
  { name: 'pollutionDocument', maxCount: 1 }
]);

export const userUpload = upload.fields([
  { name: 'profileImage', maxCount: 1 }
]);

// Single file upload (for other routes)
export const singleUpload = upload.single('file');

// Multiple files upload (for other routes)
export const multipleUpload = upload.array('files', 5);

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size too large. Maximum size is ${config.upload.maxFileSize / (1024 * 1024)}MB`
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