import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { JWTPayload, UserRole, NotificationPayload } from '../types';
import { logger } from '../utils/logger';
import config from '../config';
import { LocationRepository } from '../repositories/LocationRepository';
import { ResponseMessages } from '../enums/ResponseMessages';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export class SocketService {
  private io: SocketIOServer;
  private userRepository: UserRepository;
  private orderRepository: OrderRepository;
  private locationRepository: LocationRepository;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: SocketIOServer) {
    this.io = io;
    this.userRepository = new UserRepository();
    this.orderRepository = new OrderRepository();
    this.locationRepository = new LocationRepository();
  }

  public initialize(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error(ResponseMessages.AUTH_TOKEN_REQUIRED));
        }

        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
        const user = await this.userRepository.findById(decoded.userId);

        if (!user || !user.isActive) {
          return next(new Error(ResponseMessages.USER_NOT_FOUND_OR_INACTIVE));
        }

        socket.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };

        next();
      } catch (error) {
        next(new Error(ResponseMessages.INVALID_TOKEN));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket service initialized');
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user!.userId;
    const role = socket.user!.role;

    // Store user connection
    this.connectedUsers.set(userId, socket.id);
    logger.info(`User connected: ${userId} (${role})`);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Join role-based rooms
    socket.join(`role:${role}`);

    // Join partners to location tracking room
    if (role === UserRole.PARTNER) {
      socket.join('partners');
      this.handlePartnerConnection(socket);
    }

    // Join customers to customer room
    if (role === UserRole.CUSTOMER) {
      socket.join('customers');
    }

    // Join admins to admin room
    if (role === UserRole.ADMIN) {
      socket.join('admins');
    }

    // Handle events
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  private setupEventHandlers(socket: AuthenticatedSocket): void {
    const userId = socket.user!.userId;
    const role = socket.user!.role;

    // Location tracking events (for partners)
    if (role === UserRole.PARTNER) {
      socket.on('location_update', async (data) => {
        await this.handleLocationUpdate(socket, data);
      });

      socket.on('online_status', async (data) => {
        await this.handleOnlineStatusUpdate(socket, data);
      });
    }

    // Order tracking events
    socket.on('join_order_room', (orderId: string) => {
      socket.join(`order:${orderId}`);
      logger.info(`User ${userId} joined order room: ${orderId}`);
    });

    socket.on('leave_order_room', (orderId: string) => {
      socket.leave(`order:${orderId}`);
      logger.info(`User ${userId} left order room: ${orderId}`);
    });

    // Message events
    socket.on('send_message', async (data) => {
      await this.handleMessage(socket, data);
    });

    // Ping/pong for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  private async handlePartnerConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.user!.userId;

    try {
      // Update partner online status
      await this.userRepository.updatePartnerOnlineStatus(userId, true);

      // Broadcast to admins that a partner came online
      this.io.to('admins').emit('partner_online', {
        userId,
        timestamp: new Date(),
      });

    } catch (error) {
      logger.error('Error handling partner connection:', error);
    }
  }

  private async handleLocationUpdate(socket: AuthenticatedSocket, data: any): Promise<void> {
    const userId = socket.user!.userId;

    try {
      // Update location in database
      await this.locationRepository.updateUserLocation(userId, data.coordinates, {
        heading: data.heading,
        speed: data.speed,
        isOnline: true,
        batteryLevel: data.batteryLevel,
        networkType: data.networkType,
        orderId: data.orderId,
      });

      // If partner is on an active order, emit location to order room
      if (data.orderId) {
        socket.to(`order:${data.orderId}`).emit('partner_location_update', {
          orderId: data.orderId,
          location: {
            coordinates: data.coordinates,
            heading: data.heading,
            speed: data.speed,
            timestamp: new Date(),
          },
        });
      }

      // Emit to admins for monitoring
      this.io.to('admins').emit('partner_location', {
        userId,
        location: data.coordinates,
        orderId: data.orderId,
        timestamp: new Date(),
      });

    } catch (error) {
      logger.error('Error handling location update:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  private async handleOnlineStatusUpdate(socket: AuthenticatedSocket, data: { isOnline: boolean }): Promise<void> {
    const userId = socket.user!.userId;

    try {
      await this.userRepository.updatePartnerOnlineStatus(userId, data.isOnline);

      // Broadcast status change
      this.io.to('admins').emit('partner_status_change', {
        userId,
        isOnline: data.isOnline,
        timestamp: new Date(),
      });

    } catch (error) {
      logger.error('Error handling online status update:', error);
    }
  }

  private async handleMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    const senderId = socket.user!.userId;
    const { recipientId, message, orderId } = data;

    try {
      // Basic message validation
      if (!recipientId || !message) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      const messageData = {
        senderId,
        recipientId,
        message,
        orderId,
        timestamp: new Date(),
      };

      // Send to recipient if online
      this.io.to(`user:${recipientId}`).emit('new_message', messageData);

      // Send confirmation to sender
      socket.emit('message_sent', messageData);

      // If message is related to an order, emit to order room
      if (orderId) {
        socket.to(`order:${orderId}`).emit('order_message', messageData);
      }

    } catch (error) {
      logger.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.user!.userId;
    const role = socket.user!.role;

    // Remove from connected users
    this.connectedUsers.delete(userId);

    // Update partner status if applicable
    if (role === UserRole.PARTNER) {
      this.userRepository.updatePartnerOnlineStatus(userId, false)
        .catch(error => logger.error('Error updating partner offline status:', error));

      // Notify admins
      this.io.to('admins').emit('partner_offline', {
        userId,
        timestamp: new Date(),
      });
    }

    logger.info(`User disconnected: ${userId} (${role})`);
  }

  // Public methods for sending notifications
  public async sendNotificationToUser(userId: string, notification: NotificationPayload): Promise<void> {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  public async sendNotificationToRole(role: UserRole, notification: NotificationPayload): Promise<void> {
    this.io.to(`role:${role}`).emit('notification', notification);
  }

  public async sendOrderUpdate(orderId: string, updateData: any): Promise<void> {
    this.io.to(`order:${orderId}`).emit('order_update', {
      orderId,
      ...updateData,
      timestamp: new Date(),
    });
  }

  public async broadcastToPartners(event: string, data: any): Promise<void> {
    this.io.to('partners').emit(event, data);
  }

  public async broadcastToAdmins(event: string, data: any): Promise<void> {
    this.io.to('admins').emit(event, data);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}