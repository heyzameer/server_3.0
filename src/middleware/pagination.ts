import { Request, Response, NextFunction } from 'express';
import { PaginationOptions } from '../types';

export const pagination = (req: Request, res: Response, next: NextFunction) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sort = (req.query.sort as string) || 'createdAt';
  const order = (req.query.order as 'asc' | 'desc') || 'desc';

  req.pagination = {
    page,
    limit,
    sort,
    order,
  } as PaginationOptions;

  next();
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      pagination?: PaginationOptions;
    }
  }
}