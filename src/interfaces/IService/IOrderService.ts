import { OrderStatus, DeliveryType, PaymentMethod, PaginationOptions, PaginatedResult, OrderItem, Address } from '../../types';
import { IOrder } from '../IModel/IOrder';

export interface IOrderService {
  createOrder(orderData: any): Promise<IOrder>;
  getOrderById(orderId: string): Promise<IOrder>;
  getOrderByNumber(orderNumber: string): Promise<IOrder>;
  getCustomerOrders(customerId: string, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  getDeliveryPartnerOrders(deliveryPartnerId: string, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  getOrdersByStatus(status: OrderStatus, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  getAvailableOrders(pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  assignDeliveryPartner(orderId: string, deliveryPartnerId: string): Promise<IOrder>;
  updateOrderStatus(orderId: string, newStatus: OrderStatus, notes?: string, userId?: string): Promise<IOrder>;
  cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<IOrder>;
  verifyPickupOTP(orderId: string, otpCode: string, deliveryPartnerId: string): Promise<IOrder>;
  verifyDeliveryOTP(orderId: string, otpCode: string, deliveryPartnerId: string): Promise<IOrder>;
  rateOrder(orderId: string, rating: number, comment: string, ratingType: 'customer' | 'partner'): Promise<IOrder>;
  getOrderStats(deliveryPartnerId?: string): Promise<any>;
  getOrdersInDateRange(startDate: Date, endDate: Date, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
  findOrdersNearLocation(latitude: number, longitude: number, radiusKm: number, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>>;
}