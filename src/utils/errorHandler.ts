import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../types';
import { logger } from './logger';
import config from '../config';

export class AppError extends Error implements CustomError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  return new AppError(message, statusCode);
};

export const handleError = (error: CustomError, req: Request, res: Response, next: NextFunction) => {
  let { statusCode = 500, message } = error;

  // Log error
  logger.error(`Error ${statusCode}: ${message}`, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Don't leak error details in production
  if (config.env === 'production' && !error.isOperational) {
    message = 'Something went wrong!';
  }

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date(),
    ...(config.env === 'development' && { stack: error.stack }),
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};