import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// import { createError } from '../utils/errorHandler';
import { sendError } from '../utils/response';
import config from '../config';
import { container } from '../container/container';
import { PartnerRepository } from '../repositories/PartnerRepository';
import { UserRole } from '../types';

interface PartnerJWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extend Request interface to include partner
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      partner?: {
        partnerId: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticatePartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header

    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access token required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return sendError(res, 'Access token required', 401);
    }

    // Verify token
    let decoded: PartnerJWTPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as PartnerJWTPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired', 401);
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token', 401);
      }
      return sendError(res, 'Token verification failed', 401);
    }

    // Check if partner exists and is active

    const partnerRepository = container.resolve(PartnerRepository);
    const partner = await partnerRepository.findById(decoded.userId);

    if (!partner) {
      return sendError(res, 'Partner not found', 401);
    }

    if (!partner.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }

    // Add partner info to request first
    req.partner = {
      partnerId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    // Attach isActive status for downstream use
    (req.partner as any).isActive = partner.isActive;

    // For compatibility with existing code that uses req.user
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: UserRole.PARTNER
    };


    next();
  } catch (error) {
    console.error('Partner authentication error:', error);
    return sendError(res, 'Authentication failed', 401);
  }
};

// Optional authentication middleware (doesn't throw error if no token)
export const optionalPartnerAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    const decoded = jwt.verify(token, config.jwtSecret) as PartnerJWTPayload;

    const partnerRepository = container.resolve(PartnerRepository);
    const partner = await partnerRepository.findById(decoded.userId);

    if (partner && partner.isActive) {
      req.partner = {
        partnerId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: UserRole.PARTNER
      };
    }

    next();
  } catch {
    // Don't throw error for optional auth
    next();
  }
};

// Middleware to check if partner is verified
export const requireVerifiedPartner = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.partner) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const partnerRepository = container.resolve(PartnerRepository);
    const partner = await partnerRepository.findById(req.partner.partnerId);

    if (!partner) {
      return sendError(res, 'Partner not found', 404);
    }

    if (!partner.isVerified) {
      return sendError(res, 'Partner verification required', 403);
    }

    next();
  } catch (error) {
    console.error('Partner verification check error:', error);
    return sendError(res, 'Verification check failed', 500);
  }
};

// Middleware to check partner status
export const checkPartnerStatus = (allowedStatuses: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.partner) {
      return sendError(res, 'Authentication required', 401);
    }

    try {
      const partnerRepository = container.resolve(PartnerRepository);
      const partner = await partnerRepository.findById(req.partner.partnerId);

      if (!partner || typeof partner.status !== 'string') {
        return sendError(res, 'Partner not found', 404);
      }

      if (!allowedStatuses.includes(partner.status)) {
        return sendError(res, `Access denied. Partner status: ${partner.status}`, 403);
      }

      next();
    } catch (error) {
      console.error('Partner status check error:', error);
      return sendError(res, 'Status check failed', 500);
    }
  };
};