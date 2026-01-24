import { OrderStatus, PaginationOptions, PaginatedResult } from '../../types';
import { IOrder } from '../IModel/IOrder';

export interface IOrderService {
  createOrder(orderData: any): Promise<IOrder>;
  getOrderById(orderId: string): Promise<IOrder>;
  getOrderByNumber(orderNumber: string): Promise<IOrder>;
  getCustomerOrders(customerId: string, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  getPartnerOrders(partnerId: string, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  getOrdersByStatus(status: OrderStatus, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  getAvailableOrders(pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  assignPartner(orderId: string, partnerId: string): Promise<IOrder>;
  updateOrderStatus(orderId: string, newStatus: OrderStatus, notes?: string, userId?: string): Promise<IOrder>;
  cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<IOrder>;
  verifyCheckInOTP(orderId: string, otpCode: string, partnerId: string): Promise<IOrder>;
  verifyCompletionOTP(orderId: string, otpCode: string, partnerId: string): Promise<IOrder>;
  rateOrder(orderId: string, rating: number, comment: string, ratingType: 'customer' | 'partner'): Promise<IOrder>;
  getOrderStats(partnerId?: string): Promise<any>;
  getOrdersInDateRange(startDate: Date, endDate: Date, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  findOrdersNearLocation(latitude: number, longitude: number, radiusKm: number, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
}