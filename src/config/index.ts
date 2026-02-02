import dotenv from 'dotenv';
dotenv.config();
import { AppConfig } from '../types';

const error = (message = "error") => {
  throw new Error(`Config error: ${message}`);
};

// Add small helpers to centralize env reading and validation
const get = (key: string, required = false, fallback?: string): string | undefined => {
  const v = process.env[key];
  if ((v === undefined || v === '') && required) error(`${key} not defined`);
  return (v === undefined || v === '') ? fallback : v;
};

const getInt = (key: string, required = false, fallback?: number, radix = 10): number => {
  const raw = get(key, required, fallback !== undefined ? String(fallback) : undefined);
  if (raw === undefined) {
    if (required) error(`${key} is not defined`);
    return fallback as number;
  }
  const n = parseInt(raw, radix);
  if (Number.isNaN(n)) error(`${key} is not a valid integer`);
  return n;
};

const getBool = (key: string, fallback = false): boolean => {
  const raw = get(key, false);
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === 'true';
};

const config: AppConfig = {
  port: getInt('PORT', true),
  env: get('NODE_ENV', true)!,
  jwtSecret: get('JWT_SECRET', true)!,
  jwtExpiration: get('JWT_EXPIRATION', true)!,
  jwtRefreshExpiration: get('JWT_REFRESH_EXPIRATION', true)!,

  // cookieExpiration as days (int); compute cookieMaxAge (ms) below
  cookieExpiration: getInt('COOKIE_EXPIRATION', false, 7), // days

  maxSizeLimit: get('MAX_SIZE_LIMIT', false, '1mb')!,

  database: {
    uri: get('MONGODB_URI', true)!,
    options: {
      maxPoolSize: getInt('DB_MAX_POOL_SIZE', false, 10),
      serverSelectionTimeoutMS: getInt('DB_SERVER_SELECTION_TIMEOUT', false, 5000),
      socketTimeoutMS: getInt('DB_SOCKET_TIMEOUT', false, 45000),
      heartbeatFrequencyMS: getInt('DB_HEARTBEAT_FREQUENCY', false, 10000),
    },
  },

  cors: {
    origin: get('CORS_ORIGIN', false, 'http://localhost:5173')!,
    credentials: getBool('CORS_CREDENTIALS', false),
  },

  rateLimit: {
    windowMs: getInt('RATE_LIMIT_WINDOW_MS', false, 15 * 60 * 1000), // default 15 minutes
    max: getInt('RATE_LIMIT_MAX', false, 1000),
  },

  upload: {
    // ensure radix and fallback
    maxFileSize: getInt('MAX_FILE_SIZE', false, 10 * 1024 * 1024), // 10MB default
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ]
  },

  // AWS S3 Configuration
  aws: {
    region: get('AWS_REGION', false, 'ap-south-1')!,
    accessKeyId: get('AWS_ACCESS_KEY_ID', false, '')!,
    secretAccessKey: get('AWS_SECRET_ACCESS_KEY', false, '')!,
    s3BucketName: get('AWS_S3_BUCKET_NAME', false, '')!,
  },

  otp: {
    expirationMinutes: getInt('OTP_EXPIRATION_MINUTES', false, 10),
    maxAttempts: getInt('OTP_MAX_ATTEMPTS', false, 3),
  },

  email: {
    service: get('EMAIL_SERVICE', false, 'gmail')!,
    host: get('EMAIL_HOST', false, 'smtp.gmail.com')!,
    port: getInt('EMAIL_PORT', false, 587),
    secure: getBool('EMAIL_SECURE', false),
    auth: {
      user: get('EMAIL_USER', false, '')!,
      pass: get('EMAIL_PASS', false, '')!,
    },
  },
  logs: {
    level: get('LOG_LEVEL', false, 'info')!,
    maxSize: get('LOG_MAX_SIZE', false, '20m')!,
    maxFiles: get('LOG_MAX_FILES', false, '7d')!,
  },
  encryptionSecret: get('ENCRYPTION_SECRET', false, 'bf3c7263336113b2767096e25c0406adbf3c7263336113b2767096e25c0406ad')!,
  gemini: {
    apiKey: get('GEMINI_API_KEY', false, '')!,
  },
  useGeminiOCR: get('USE_GEMINI_OCR', false, 'false')! === 'true',
  signedUrlExpiration: Number(get('SIGNED_URL_EXPIRATION', false, '86400')) || 86400,
  redis: {
    host: get('REDIS_HOST', false, 'localhost')!,
    port: getInt('REDIS_PORT', false, 6379),
    password: get('REDIS_PASSWORD', false),
  },
};

// compute derived values
// cookieMaxAge in milliseconds based on cookieExpiration days
(config as any).cookieMaxAge = (config.cookieExpiration && Number.isFinite(Number(config.cookieExpiration)))
  ? config.cookieExpiration * 24 * 60 * 60 * 1000
  : 7 * 24 * 60 * 60 * 1000;

export default config;

