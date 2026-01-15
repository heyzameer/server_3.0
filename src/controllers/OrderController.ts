import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/errorHandler';
import { OrderStatus } from '../types';
import { inject, injectable } from 'tsyringe';
import { IOrderService } from '../interfaces/IService/IOrderService';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  VerifyOTPDto,
  RateOrderDto,
  AssignPartnerDto
} from '../dtos/order.dto';

/**
 * Controller for order management.
 * Handles order creation, status updates, assignments, and verification.
 */
@injectable()
export class OrderController {

  constructor(
    @inject('OrderService') private orderService: IOrderService
  ) { }

  /**
   * Create a new delivery order.
   */
  createOrder = asyncHandler(async (req: Request<any, any, CreateOrderDto>, res: Response, _next: NextFunction) => {
    const customerId = req.user!.userId;
    const orderData = {
      ...req.body,
      customerId,
    };

    const order = await this.orderService.createOrder(orderData);

    sendSuccess(res, 'Order created successfully', { order }, 201);
  });

  /**
   * Get order details by ID.
   */
  getOrderById = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const order = await this.orderService.getOrderById(id);

    sendSuccess(res, 'Order retrieved successfully', { order });
  });

  /**
   * Get order details by order number.
   */
  getOrderByNumber = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { orderNumber } = req.params;
    const order = await this.orderService.getOrderByNumber(orderNumber);

    sendSuccess(res, 'Order retrieved successfully', { order });
  });

  /**
   * Get orders belonging to the current customer.
   */
  getMyOrders = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const customerId = req.user!.userId;
    const pagination = req.pagination!;

    const result = await this.orderService.getCustomerOrders(customerId, pagination);

    sendSuccess(res, 'Orders retrieved successfully', result);
  });

  /**
   * Get orders assigned to the current delivery partner.
   */
  getDeliveryPartnerOrders = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const deliveryPartnerId = req.user!.userId;
    const pagination = req.pagination!;

    const result = await this.orderService.getDeliveryPartnerOrders(deliveryPartnerId, pagination);

    sendSuccess(res, 'Orders retrieved successfully', result);
  });

  /**
   * Get all orders with optional status filtering.
   */
  getAllOrders = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const pagination = req.pagination!;
    const { status } = req.query;

    let result;
    if (status) {
      result = await this.orderService.getOrdersByStatus(status as OrderStatus, pagination);
    } else {
      // Defaulting to PENDING if no status provided
      result = await this.orderService.getOrdersByStatus(OrderStatus.PENDING, pagination);
    }

    sendSuccess(res, 'Orders retrieved successfully', result);
  });

  /**
   * Get orders that are available for pickup.
   */
  getAvailableOrders = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const pagination = req.pagination!;
    const result = await this.orderService.getAvailableOrders(pagination);

    sendSuccess(res, 'Available orders retrieved successfully', result);
  });

  /**
   * Assign a delivery partner to an order (Admin only).
   */
  assignDeliveryPartner = asyncHandler(async (req: Request<any, any, AssignPartnerDto>, res: Response, _next: NextFunction) => {
    const { orderId, deliveryPartnerId } = req.body;
    const order = await this.orderService.assignDeliveryPartner(orderId, deliveryPartnerId);

    sendSuccess(res, 'Delivery partner assigned successfully', { order });
  });

  /**
   * Partner accepts an available order.
   */
  acceptOrder = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;
    const deliveryPartnerId = req.user!.userId;

    const order = await this.orderService.assignDeliveryPartner(orderId, deliveryPartnerId);

    sendSuccess(res, 'Order accepted successfully', { order });
  });

  /**
   * Update the status of an order.
   */
  updateOrderStatus = asyncHandler(async (req: Request<{ orderId: string }, any, UpdateOrderStatusDto>, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user!.userId;

    const order = await this.orderService.updateOrderStatus(orderId, status, notes, userId);

    sendSuccess(res, 'Order status updated successfully', { order });
  });

  /**
   * Cancel an order with a reason.
   */
  cancelOrder = asyncHandler(async (req: Request<{ orderId: string }, any, CancelOrderDto>, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const cancelledBy = req.user!.userId;

    const order = await this.orderService.cancelOrder(orderId, reason, cancelledBy);

    sendSuccess(res, 'Order cancelled successfully', { order });
  });

  /**
   * Verify the pickup OTP code.
   */
  verifyPickupOTP = asyncHandler(async (req: Request<{ orderId: string }, any, VerifyOTPDto>, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;
    const { code } = req.body;
    const deliveryPartnerId = req.user!.userId;

    const order = await this.orderService.verifyPickupOTP(orderId, code, deliveryPartnerId);

    sendSuccess(res, 'Pickup OTP verified successfully', { order });
  });

  /**
   * Verify the delivery OTP code.
   */
  verifyDeliveryOTP = asyncHandler(async (req: Request<{ orderId: string }, any, VerifyOTPDto>, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;
    const { code } = req.body;
    const deliveryPartnerId = req.user!.userId;

    const order = await this.orderService.verifyDeliveryOTP(orderId, code, deliveryPartnerId);

    sendSuccess(res, 'Delivery OTP verified successfully', { order });
  });

  /**
   * Rate an order after delivery.
   */
  rateOrder = asyncHandler(async (req: Request<{ orderId: string }, any, RateOrderDto>, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;
    const { rating, comment, ratingType } = req.body;

    const order = await this.orderService.rateOrder(
      orderId,
      rating,
      comment || '',
      (ratingType as 'customer' | 'partner') || 'customer'
    );

    sendSuccess(res, 'Order rated successfully', { order });
  });

  /**
   * Get order statistics for a specific partner or overall.
   */
  getOrderStats = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { deliveryPartnerId } = req.query;
    const stats = await this.orderService.getOrderStats(deliveryPartnerId as string);

    sendSuccess(res, 'Order statistics retrieved successfully', { stats });
  });

  /**
   * Fetch orders within a specific date range.
   */
  getOrdersInDateRange = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { startDate, endDate } = req.query;
    const pagination = req.pagination!;

    if (!startDate || !endDate) {
      return sendError(res, 'Start date and end date are required', 400);
    }

    const result = await this.orderService.getOrdersInDateRange(
      new Date(startDate as string),
      new Date(endDate as string),
      pagination
    );

    sendSuccess(res, 'Orders retrieved successfully', result);
  });

  /**
   * Find orders near a geographic location.
   */
  findOrdersNearLocation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { latitude, longitude, radius } = req.query;
    const pagination = req.pagination!;

    if (!latitude || !longitude) {
      return sendError(res, 'Latitude and longitude are required', 400);
    }

    const result = await this.orderService.findOrdersNearLocation(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      radius ? parseFloat(radius as string) : 10,
      pagination
    );

    sendSuccess(res, 'Orders near location found', result);
  });
}