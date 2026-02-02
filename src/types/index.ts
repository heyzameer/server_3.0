import mongoose from "mongoose";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface Address {
  _id?: string | mongoose.Types.ObjectId;
  street: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  coordinates?: LocationCoordinates;
  landmark?: string;
  addressType?: 'home' | 'work' | 'other';
}

export enum UserRole {
  CUSTOMER = 'customer',
  PARTNER = 'partner',
  ADMIN = 'admin'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_SERVICE = 'out_for_service',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  DIGITAL_WALLET = 'digital_wallet',
  UPI = 'upi'
}

export enum BookingType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  LUXURY = 'luxury',
  VIP = 'vip'
}

export enum OTPType {
  CHECKIN = 'checkin',
  COMPLETION = 'completion',
  PHONE_VERIFICATION = 'phone_verification',
  EMAIL_VERIFICATION = 'email_verification'
}

export enum OTPStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed'
}

export interface OrderItem {
  name: string;
  description?: string;
  category: string;
  quantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  value: number;
  fragile?: boolean;
  specialInstructions?: string;
}

export interface Pricing {
  basePrice: number;
  distanceCharge: number;
  weightCharge: number;
  serviceCharge: number;
  taxAmount: number;
  discount?: number;
  totalAmount: number;
}

export interface PartnerLocation {
  userId: string;
  coordinates: LocationCoordinates;
  heading?: number;
  speed?: number;
  isOnline: boolean;
  lastUpdated: Date;
}

export interface NotificationPayload {
  type: 'order_update' | 'location_update' | 'message' | 'system';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    heartbeatFrequencyMS: number;
  };
}

export interface AppConfig {
  port: number;
  env: string;
  jwtSecret: string;
  jwtExpiration: string | number;
  jwtRefreshExpiration: string | number;
  cookieExpiration: number;
  maxSizeLimit: string;
  database: DatabaseConfig;
  cors: {
    origin: string;
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3BucketName: string;
  };
  otp: {
    expirationMinutes: number;
    maxAttempts: number;
  };

  email: {
    service: string;
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  logs: {
    level: string;
    maxSize: string;
    maxFiles: string;
  };
  encryptionSecret: string;
  gemini: {
    apiKey: string;
  };
  useGeminiOCR: boolean;
  signedUrlExpiration: number;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
}

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export interface RequestUser {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export enum PartnerDocumentType {
  AADHAR_FRONT = 'aadhar_front',
  AADHAR_BACK = 'aadhar_back',
  PROFILE_PICTURE = 'profile_picture'
}

export interface PartnerRegistrationData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth?: string;
}

export interface BasicPartnerRegistrationData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
}

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}