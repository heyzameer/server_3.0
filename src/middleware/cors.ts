import cors from 'cors';
import config from '../config';

export const corsMiddleware = cors({
  origin: config.cors.origin.split(','),
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});