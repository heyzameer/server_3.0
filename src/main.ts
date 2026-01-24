import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();
import config from './config';
import "reflect-metadata";
import { DatabaseConnection } from './config/database';
import { corsMiddleware } from './middleware/cors';
import { securityMiddleware } from './middleware/security';
import { generalLimiter } from './middleware/rateLimit';
import { httpLogger } from './middleware/logging';
import routes from './routes';
import { SocketService } from './services/SocketService';
import { PartnerService } from './services/PartnerService';
import { handleError } from './utils/errorHandler';
import { logger } from './utils/logger';
import { container } from 'tsyringe';
import './container/container';
import cookieParser from 'cookie-parser';
import passport from 'passport';


class Application {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private database: DatabaseConnection;
  private socketService: SocketService;

  constructor() {
    this.app = express();
    this.app.use(passport.initialize());

    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
    });
    this.database = DatabaseConnection.getInstance();
    this.socketService = new SocketService(this.io);
    container.registerInstance('SocketService', this.socketService);

    // Inject SocketService into PartnerService
    const partnerService = container.resolve('PartnerService') as PartnerService;
    if (partnerService && typeof partnerService.setSocketService === 'function') {
      partnerService.setSocketService(this.socketService);
    }

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocket();
  }

  private initializeMiddlewares(): void {
    // Security middlewares
    this.app.use(securityMiddleware);
    this.app.use(corsMiddleware);

    // Logging middleware
    this.app.use(httpLogger);

    // Rate limiting
    this.app.use(generalLimiter);

    this.app.use((req, res, next) => {
      // Set timeout to 5 minutes for upload routes
      if (req.url.includes('/register') || req.url.includes('/upload')) {
        req.setTimeout(300000); // 5 minutes
        res.setTimeout(300000); // 5 minutes
      }
      next();
    });

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Serve static files
    this.app.use('/uploads', express.static('uploads'));

    logger.info('Middlewares initialized');
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1', routes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Travel Platform API',
        version: '1.0.0',
        timestamp: new Date(),
        docs: '/api/v1/docs', // Future documentation endpoint
      });
    });

    logger.info('Routes initialized');
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use(handleError);

    logger.info('Error handling initialized');
  }

  private initializeSocket(): void {
    this.socketService.initialize();
    logger.info('Socket.io initialized');
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.database.connect();


      // Start server
      this.server.listen(config.port, () => {
        logger.info(`Server running on port ${config.port} in ${config.env} mode`);
        logger.info(`API available at http://localhost:${config.port}/api/v1`);
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Close server
      this.server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await this.database.disconnect();
          logger.info('Database connection closed');

          // Close socket.io
          this.io.close();
          logger.info('Socket.io server closed');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Start the application
const application = new Application();
application.start();