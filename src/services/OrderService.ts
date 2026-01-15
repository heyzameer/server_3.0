import {
  OrderStatus,
  PaymentStatus,
  DeliveryType,
  OTPType,
  PaginationOptions,
  PaginatedResult,
  OrderItem,
  Address,
  Pricing,
  PaymentMethod
} from '../types';
import { createError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { generateOTP, calculateDistance } from '../utils/helpers';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';
import { inject, injectable } from 'tsyringe';
import mongoose from 'mongoose';
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { IOrderRepository } from '../interfaces/IRepository/IOrderRepository';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { IOrderService } from '../interfaces/IService/IOrderService';
import { IOrder } from '../interfaces/IModel/IOrder';

/**
 * Service for handling order-related business logic.
 * Manages order lifecycle, pricing calculation, delivery partner assignment, and OTP verification.
 */
@injectable()
export class OrderService implements IOrderService {

  constructor(
    @inject('OrderRepository') private orderRepository: IOrderRepository,
    @inject('OTPRepository') private otpRepository: IOTPRepository,
    @inject('UserRepository') private userRepository: IUserRepository
  ) { }

  /**
   * Create a new order after verifying the customer and calculating pricing.
   * @param orderData - Initial order details.
   */
  async createOrder(orderData: {
    customerId: string;
    items: OrderItem[];
    pickupAddress: Address;
    deliveryAddress: Address;
    deliveryType?: DeliveryType;
    scheduledPickupTime?: Date;
    scheduledDeliveryTime?: Date;
    paymentMethod: PaymentMethod;
    specialInstructions?: string;
    customerNotes?: string;
  }): Promise<IOrder> {
    try {
      const customer = await this.userRepository.findById(orderData.customerId);
      if (!customer) {
        throw createError(ResponseMessages.CUSTOMER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const pricing = await this.calculatePricing(
        orderData.items,
        orderData.pickupAddress,
        orderData.deliveryAddress,
        orderData.deliveryType || DeliveryType.STANDARD
      );

      const distance = calculateDistance(
        orderData.pickupAddress.coordinates!.latitude,
        orderData.pickupAddress.coordinates!.longitude,
        orderData.deliveryAddress.coordinates!.latitude,
        orderData.deliveryAddress.coordinates!.longitude
      );

      const pickupOTP = generateOTP(6);
      const deliveryOTP = generateOTP(6);

      const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(
        orderData.deliveryType || DeliveryType.STANDARD,
        distance
      );

      const order = await this.orderRepository.create({
        userId: new mongoose.Types.ObjectId(orderData.customerId),
        pickupAddress: orderData.pickupAddress,
        deliveryAddress: orderData.deliveryAddress,
        deliveryType: orderData.deliveryType || DeliveryType.STANDARD,
        scheduledPickupTime: orderData.scheduledPickupTime,
        scheduledDeliveryTime: orderData.scheduledDeliveryTime,
        estimatedDeliveryTime,
        pricing: pricing.totalAmount,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        distanceKm: distance,
        status: OrderStatus.PENDING,
      });

      await this.otpRepository.createOTP(
        orderData.customerId,
        OTPType.PICKUP,
        pickupOTP,
        order._id.toString()
      );

      await this.otpRepository.createOTP(
        orderData.customerId,
        OTPType.DELIVERY,
        deliveryOTP,
        order._id.toString()
      );

      logger.info(`Order created successfully: ${order.id}`);
      return order;
    } catch (error) {
      logger.error('Create order failed:', error);
      throw error;
    }
  }

  /**
   * Get an order's full details by ID.
   */
  async getOrderById(orderId: string): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw createError(ResponseMessages.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return order;
    } catch (error) {
      logger.error('Get order by ID failed:', error);
      throw error;
    }
  }

  /**
   * Get an order by its unique order number.
   */
  async getOrderByNumber(orderNumber: string): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        throw createError(ResponseMessages.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return order;
    } catch (error) {
      logger.error('Get order by number failed:', error);
      throw error;
    }
  }

  /**
   * Fetch all orders linked to a specific customer.
   */
  async getCustomerOrders(
    customerId: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    try {
      return this.orderRepository.findByCustomer(customerId, pagination);
    } catch (error) {
      logger.error('Get customer orders failed:', error);
      throw error;
    }
  }

  /**
   * Fetch all orders assigned to a specific delivery partner.
   */
  async getDeliveryPartnerOrders(
    deliveryPartnerId: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    try {
      return this.orderRepository.findByDeliveryPartner(deliveryPartnerId, pagination);
    } catch (error) {
      logger.error('Get delivery partner orders failed:', error);
      throw error;
    }
  }

  /**
   * Fetch orders filtered by status.
   */
  async getOrdersByStatus(
    status: OrderStatus,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    try {
      return this.orderRepository.findByStatus(status, pagination);
    } catch (error) {
      logger.error('Get orders by status failed:', error);
      throw error;
    }
  }

  /**
   * Fetch orders that are currently waiting to be picked up.
   */
  async getAvailableOrders(pagination: PaginationOptions): Promise<PaginatedResult<IOrder>> {
    try {
      return this.orderRepository.findAvailableOrders(pagination);
    } catch (error) {
      logger.error('Get available orders failed:', error);
      throw error;
    }
  }

  /**
   * Assign a delivery partner to an order and update its status.
   */
  async assignDeliveryPartner(orderId: string, deliveryPartnerId: string): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw createError(ResponseMessages.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (order.deliveryPartnerId) {
        throw createError(ResponseMessages.ORDER_ALREADY_ASSIGNED, HttpStatus.BAD_REQUEST);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw createError(ResponseMessages.ORDER_CANNOT_ASSIGN, HttpStatus.BAD_REQUEST);
      }

      const deliveryPartner = await this.userRepository.findById(deliveryPartnerId);
      if (!deliveryPartner || !deliveryPartner.isActive) {
        throw createError(ResponseMessages.PARTNER_NOT_FOUND_OR_INELIGIBLE, HttpStatus.BAD_REQUEST);
      }

      const updatedOrder = await this.orderRepository.assignDeliveryPartner(orderId, deliveryPartnerId);
      if (!updatedOrder) {
        throw createError(ResponseMessages.ASSIGN_PARTNER_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Delivery partner assigned to order: ${order.id} -> ${deliveryPartnerId}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Assign delivery partner failed:', error);
      throw error;
    }
  }

  /**
   * Advance an order to a new status after validation.
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    _userId?: string
  ): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw createError(ResponseMessages.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (!this.isValidStatusTransition(order.status, newStatus)) {
        throw createError(`Invalid status transition from ${order.status} to ${newStatus}`, HttpStatus.BAD_REQUEST);
      }

      const updatedOrder = await this.orderRepository.updateStatus(orderId, newStatus, notes);
      if (!updatedOrder) {
        throw createError(ResponseMessages.ORDER_STATUS_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Order status updated: ${order.id} -> ${newStatus}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Update order status failed:', error);
      throw error;
    }
  }

  /**
   * Cancel an order and initiate refund if necessary.
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw createError(ResponseMessages.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const cancelledOrder = await this.orderRepository.cancelOrder(orderId, reason, cancelledBy);
      if (!cancelledOrder) {
        throw createError(ResponseMessages.CANCEL_ORDER_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        // TODO: Integrate actual payment gateway refund logic here
        await this.orderRepository.update(orderId, {
          paymentStatus: PaymentStatus.REFUNDED,
        });
      }

      logger.info(`Order cancelled: ${order.id} by ${cancelledBy}`);
      return cancelledOrder;
    } catch (error) {
      logger.error('Cancel order failed:', error);
      throw error;
    }
  }

  /**
   * Verify the pickup OTP provided by the customer at the pickup point.
   */
  async verifyPickupOTP(orderId: string, otpCode: string, deliveryPartnerId: string): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order || order.deliveryPartnerId?.toString() !== deliveryPartnerId) {
        throw createError(ResponseMessages.ORDER_UNAUTHORIZED, HttpStatus.FORBIDDEN);
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        throw createError(ResponseMessages.ORDER_NOT_READY_PICKUP, HttpStatus.BAD_REQUEST);
      }

      const otpVerification = await this.otpRepository.verifyOTP(
        order.userId.toString(),
        OTPType.PICKUP,
        otpCode
      );

      if (!otpVerification.success) {
        throw createError(otpVerification.message, HttpStatus.BAD_REQUEST);
      }

      const updatedOrder = await this.updateOrderStatus(
        orderId,
        OrderStatus.PICKED_UP,
        'Package picked up with OTP verification'
      );

      logger.info(`Pickup OTP verified for order: ${order.id}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Verify pickup OTP failed:', error);
      throw error;
    }
  }

  /**
   * Verify the delivery OTP provided by the customer at the destination.
   */
  async verifyDeliveryOTP(orderId: string, otpCode: string, deliveryPartnerId: string): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order || order.deliveryPartnerId?.toString() !== deliveryPartnerId) {
        throw createError(ResponseMessages.ORDER_UNAUTHORIZED, HttpStatus.FORBIDDEN);
      }

      if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
        throw createError(ResponseMessages.ORDER_NOT_OUT_DELIVERY, HttpStatus.BAD_REQUEST);
      }

      const otpVerification = await this.otpRepository.verifyOTP(
        order.userId.toString(),
        OTPType.DELIVERY,
        otpCode
      );

      if (!otpVerification.success) {
        throw createError(otpVerification.message, HttpStatus.BAD_REQUEST);
      }

      const updatedOrder = await this.updateOrderStatus(
        orderId,
        OrderStatus.DELIVERED,
        'Package delivered with OTP verification'
      );

      logger.info(`Delivery OTP verified for order: ${order.id}`);
      return updatedOrder;
    } catch (error) {
      logger.error('Verify delivery OTP failed:', error);
      throw error;
    }
  }

  /**
   * Add a rating and feedback to a completed order.
   */
  async rateOrder(
    orderId: string,
    rating: number,
    comment: string,
    ratingType: 'customer' | 'partner'
  ): Promise<IOrder> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order || order.status !== OrderStatus.DELIVERED) {
        throw createError(ResponseMessages.ONLY_DELIVERED_RATED, HttpStatus.BAD_REQUEST);
      }

      const ratedOrder = await this.orderRepository.rateOrder(orderId, rating, comment, ratingType);
      if (!ratedOrder) {
        throw createError(ResponseMessages.RATE_ORDER_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (ratingType === 'customer' && order.deliveryPartnerId) {
        await this.userRepository.updateDeliveryPartnerRating(
          order.deliveryPartnerId.toString(),
          rating
        );
      }

      logger.info(`Order rated: ${order.id} - ${rating} stars by ${ratingType}`);
      return ratedOrder;
    } catch (error) {
      logger.error('Rate order failed:', error);
      throw error;
    }
  }

  /**
   * Get high-level statistics for orders.
   */
  async getOrderStats(deliveryPartnerId?: string): Promise<any> {
    try {
      const stats = await this.orderRepository.getOrderStats(deliveryPartnerId);
      return stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        statusBreakdown: [],
      };
    } catch (error) {
      logger.error('Get order stats failed:', error);
      throw error;
    }
  }

  /**
   * Fetch orders that fall within a given date range.
   */
  async getOrdersInDateRange(
    startDate: Date,
    endDate: Date,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    try {
      return this.orderRepository.getOrdersInDateRange(startDate, endDate, pagination);
    } catch (error) {
      logger.error('Get orders in date range failed:', error);
      throw error;
    }
  }

  /**
   * Find orders within a specified radius from a point.
   */
  async findOrdersNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    try {
      return this.orderRepository.findOrdersInRadius(latitude, longitude, radiusKm, pagination);
    } catch (error) {
      logger.error('Find orders near location failed:', error);
      throw error;
    }
  }

  /**
   * Internal logic to calculate the price based on distance, weight, and urgency.
   */
  private async calculatePricing(
    items: OrderItem[],
    pickupAddress: Address,
    deliveryAddress: Address,
    deliveryType: DeliveryType
  ): Promise<Pricing> {
    const distance = calculateDistance(
      pickupAddress.coordinates!.latitude,
      pickupAddress.coordinates!.longitude,
      deliveryAddress.coordinates!.latitude,
      deliveryAddress.coordinates!.longitude
    );

    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);

    const basePrice = 50;
    const distanceCharge = distance * 10;
    const weightCharge = totalWeight * 5;

    let deliveryCharge = 25;
    if (deliveryType === DeliveryType.EXPRESS) deliveryCharge = 100;
    if (deliveryType === DeliveryType.SAME_DAY) deliveryCharge = 200;
    if (deliveryType === DeliveryType.SCHEDULED) deliveryCharge = 50;

    const subtotal = basePrice + distanceCharge + weightCharge + deliveryCharge;
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    return {
      basePrice,
      distanceCharge,
      weightCharge,
      deliveryCharge,
      taxAmount,
      discount: 0,
      totalAmount,
    };
  }

  /**
   * Estimate the delivery time based on distance and delivery type.
   */
  private calculateEstimatedDeliveryTime(deliveryType: DeliveryType, distance: number): Date {
    const now = new Date();
    let hours = 4;
    if (deliveryType === DeliveryType.EXPRESS) hours = Math.max(2, distance * 0.5);
    if (deliveryType === DeliveryType.SAME_DAY) hours = 8;
    if (deliveryType === DeliveryType.SCHEDULED) hours = 24;

    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Validate if a status transition is permissible according to business rules.
   */
  private isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: { [key in OrderStatus]: OrderStatus[] } = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
      [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT, OrderStatus.RETURNED],
      [OrderStatus.IN_TRANSIT]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.RETURNED],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.RETURNED]: [],
    };
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}