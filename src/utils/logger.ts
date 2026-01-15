import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config';

// Readable format for console
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }

  return log;
});

// Daily rotate file transport
const fileRotateTransport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,        // compress old logs
  maxSize: config.logs?.maxSize || '20m',             // rotate if > config size
  maxFiles: config.logs?.maxFiles || '7d',            // retention
  level: 'info',
});

const errorRotateTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: config.logs?.maxSize || '10m',
  maxFiles: config.logs?.maxFiles || '14d',
  level: 'error',
});

export const logger = winston.createLogger({
  level: config.logs?.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      ),
    }),

    // Rotated logs
    fileRotateTransport,
    errorRotateTransport
  ],
});

export default logger;
