// import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { OrderStatus, PaginationOptions, PaginatedResult } from '../types';
import { IOrderRepository } from '../interfaces/IRepository/IOrderRepository';
import { injectable } from 'tsyringe';
import { IOrder } from '../interfaces/IModel/IOrder';
import { Order } from '../models/Order';

@injectable()
export class OrderRepository extends BaseRepository<IOrder> implements IOrderRepository {
  constructor() {
    super(Order);
  }

  async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return this.findOne({ orderNumber });
  }

  async findByCustomer(customerId: string, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>> {
    return this.findWithPagination(
      { customerId },
      pagination,
      ['customerId', 'deliveryPartnerId']
    );
  }

  async findByDeliveryPartner(
    deliveryPartnerId: string,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    return this.findWithPagination(
      { deliveryPartnerId },
      pagination,
      ['customerId', 'deliveryPartnerId']
    );
  }

  async findByStatus(status: OrderStatus, pagination: PaginationOptions): Promise<PaginatedResult<IOrder>> {
    return this.findWithPagination({ status }, pagination, ['customerId', 'deliveryPartnerId']);
  }

  async findActiveOrders(pagination: PaginationOptions): Promise<PaginatedResult<IOrder>> {
    const activeStatuses = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
      OrderStatus.OUT_FOR_DELIVERY,
    ];

    return this.findWithPagination(
      { status: { $in: activeStatuses } },
      pagination,
      ['customerId', 'deliveryPartnerId']
    );
  }

  async findAvailableOrders(pagination: PaginationOptions): Promise<PaginatedResult<IOrder>> {
    return this.findWithPagination(
      { status: OrderStatus.CONFIRMED, deliveryPartnerId: { $exists: false } },
      pagination,
      'customerId'
    );
  }

  async assignDeliveryPartner(orderId: string, deliveryPartnerId: string): Promise<IOrder | null> {
    return this.update(orderId, {
      deliveryPartnerId,
      status: OrderStatus.PICKED_UP,
    });
  }

  async updateStatus(orderId: string, status: OrderStatus, notes?: string): Promise<IOrder | null> {
    const updateData: any = { status };

    // Add timeline entry
    const timelineEntry = {
      status,
      timestamp: new Date(),
      notes,
    };

    return this.model.findByIdAndUpdate(
      orderId,
      {
        ...updateData,
        $push: { timeline: timelineEntry },
      },
      { new: true }
    );
  }

  async findOrdersInRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    const filter = {
      status: { $in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
      'pickupAddress.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000,
        },
      },
    };

    return this.findWithPagination(filter, pagination, 'customerId');
  }

  async getOrderStats(deliveryPartnerId?: string): Promise<any> {
    const matchStage: any = {};
    if (deliveryPartnerId) {
      matchStage.deliveryPartnerId = deliveryPartnerId;
    }

    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: '$count' },
          totalRevenue: { $sum: '$totalAmount' },
          statusBreakdown: {
            $push: {
              status: '$_id',
              count: '$count',
              amount: '$totalAmount',
            },
          },
        },
      },
    ]);
  }

  async getOrdersInDateRange(
    startDate: Date,
    endDate: Date,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IOrder>> {
    return this.findWithPagination(
      {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      pagination,
      ['customerId', 'deliveryPartnerId']
    );
  }

  async cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<IOrder | null> {
    return this.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancellationReason: reason,
      cancelledBy,
      cancelledAt: new Date(),
    });
  }

  async rateOrder(
    orderId: string,
    rating: number,
    comment: string,
    ratingType: 'customer' | 'partner'
  ): Promise<IOrder | null> {
    const updateField = ratingType === 'customer' ? 'customerRating' : 'deliveryPartnerRating';
    const commentField = ratingType === 'customer' ? 'customerComment' : 'deliveryPartnerComment';

    return this.update(orderId, {
      [`rating.${updateField}`]: rating,
      [`rating.${commentField}`]: comment,
    });
  }
}