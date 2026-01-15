import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  error?: string
): void => {
  const response: ApiResponse<T> = {
    success: statusCode < 400,
    message,
    data,
    error,
    timestamp: new Date(),
  };

  res.status(statusCode).json(response);
};

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): void => {
  sendResponse(res, statusCode, message, data);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string
): void => {
  sendResponse(res, statusCode, message, undefined, error);
};