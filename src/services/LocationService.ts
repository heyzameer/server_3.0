import {
  LocationCoordinates,
  PaginationOptions,
  PaginatedResult,
  UserRole
} from '../types';
import { createError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { injectable, inject } from 'tsyringe';
import { ILocationService } from '../interfaces/IService/ILocationService';
import mongoose from 'mongoose';
import { ILocationRepository } from '../interfaces/IRepository/ILocationRepository';
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { ILocation } from '../interfaces/IModel/ILocation';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';

/**
 * Service for managing geographical locations and real-time tracking.
 * Handles user location updates, history, nearby partner searches, and tracking analytics.
 */
@injectable()
export class LocationService implements ILocationService {

  constructor(
    @inject('LocationRepository') private locationRepository: ILocationRepository,
    @inject('UserRepository') private userRepository: IUserRepository
  ) { }

  /**
   * Update the user's current location and optionally their online status.
   * @param userId - ID of the user (Customer or Partner).
   * @param coordinates - New latitude, longitude, and accuracy.
   * @param additionalData - Optional metadata like speed, heading, or linked order.
   */
  async updateUserLocation(
    userId: string,
    coordinates: LocationCoordinates,
    additionalData?: {
      heading?: number;
      speed?: number;
      address?: string;
      isOnline?: boolean;
      batteryLevel?: number;
      networkType?: string;
      orderId?: string | undefined;
    }
  ): Promise<ILocation> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const location = await this.locationRepository.updateUserLocation(
        userId,
        coordinates,
        additionalData ? {
          ...additionalData,
          orderId: additionalData.orderId
            ? new mongoose.Types.ObjectId(additionalData.orderId)
            : undefined,
        } : undefined
      );

      if (user.role === UserRole.PARTNER) {
        await this.userRepository.update(userId, {
          'deliveryPartnerInfo.lastLocationUpdate': new Date(),
        });

        if (additionalData?.isOnline !== undefined) {
          await this.userRepository.updateDeliveryPartnerOnlineStatus(
            userId,
            additionalData.isOnline
          );
        }
      }

      logger.info(`Location updated for user: ${userId}`);
      return location;
    } catch (error) {
      logger.error('Update user location failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve the most recent location record for a user.
   */
  async getLatestLocation(userId: string): Promise<ILocation | null> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return this.locationRepository.getLatestLocation(userId);
    } catch (error) {
      logger.error('Get latest location failed:', error);
      throw error;
    }
  }

  /**
   * Fetch paginated history of a user's geographical movements.
   */
  async getLocationHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ILocation> | ILocation[]> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return this.locationRepository.getLocationHistory(userId, startDate, endDate, pagination);
    } catch (error) {
      logger.error('Get location history failed:', error);
      throw error;
    }
  }

  /**
   * Find partners currently active within a specific radius of a coordinate.
   */
  async findNearbyDeliveryPartners(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<any[]> {
    try {
      if (latitude < -90 || latitude > 90) throw createError('Invalid latitude', HttpStatus.BAD_REQUEST);
      if (longitude < -180 || longitude > 180) throw createError('Invalid longitude', HttpStatus.BAD_REQUEST);
      if (radiusKm <= 0 || radiusKm > 100) throw createError('Radius must be between 1 and 100 km', HttpStatus.BAD_REQUEST);

      const nearbyPartners = await this.locationRepository.findNearbyDeliveryPartners(
        latitude,
        longitude,
        radiusKm
      );
      return nearbyPartners;
    } catch (error) {
      logger.error('Find nearby delivery partners failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve all location updates belonging to a specific order tracking session.
   */
  async getOrderTrackingLocations(orderId: string): Promise<ILocation[]> {
    try {
      return this.locationRepository.getOrderTrackingLocations(orderId);
    } catch (error) {
      logger.error('Get order tracking locations failed:', error);
      throw error;
    }
  }

  /**
   * Toggle the delivery partner's availability status.
   */
  async updateDeliveryPartnerOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || user.role !== UserRole.PARTNER) {
        throw createError(ResponseMessages.NOT_DELIVERY_PARTNER, HttpStatus.BAD_REQUEST);
      }

      await this.userRepository.updateDeliveryPartnerOnlineStatus(userId, isOnline);
      await this.locationRepository.updateDeliveryPartnerStatus(userId, isOnline);

      logger.info(`Delivery partner online status updated: ${userId} - ${isOnline}`);
    } catch (error) {
      logger.error('Update delivery partner online status failed:', error);
      throw error;
    }
  }

  /**
   * Get all location records marked as being from online delivery partners.
   */
  async getActiveDeliveryPartners(): Promise<ILocation[]> {
    try {
      return this.locationRepository.getActiveDeliveryPartners();
    } catch (error) {
      logger.error('Get active delivery partners failed:', error);
      throw error;
    }
  }

  /**
   * Analyze partner movement statistics (speed, distance) for a timeframe.
   */
  async getDeliveryPartnerMovementStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || user.role !== UserRole.PARTNER) {
        throw createError(ResponseMessages.NOT_DELIVERY_PARTNER, HttpStatus.BAD_REQUEST);
      }

      const stats = await this.locationRepository.getDeliveryPartnerMovementStats(
        userId,
        startDate,
        endDate
      );

      return stats[0] || {
        totalLocations: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        totalDistance: 0,
        firstLocation: null,
        lastLocation: null,
      };
    } catch (error) {
      logger.error('Get delivery partner movement stats failed:', error);
      throw error;
    }
  }

  /**
   * Track the current and past locations associated with an order delivery.
   */
  async trackOrderLocation(orderId: string): Promise<{
    deliveryPartnerLocation: ILocation | null;
    locationHistory: ILocation[];
  }> {
    try {
      const locationHistory = await this.locationRepository.getOrderTrackingLocations(orderId);

      let deliveryPartnerLocation: ILocation | null = null;
      if (locationHistory.length > 0) {
        const latestLocation = locationHistory[locationHistory.length - 1];
        deliveryPartnerLocation = await this.locationRepository.getLatestLocation(
          latestLocation.userId.toString()
        );
      }

      return {
        deliveryPartnerLocation,
        locationHistory,
      };
    } catch (error) {
      logger.error('Track order location failed:', error);
      throw error;
    }
  }

  /**
   * Aggregate location data for system-wide or user-specific analytics.
   */
  async getLocationAnalytics(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const filter: any = {};
      if (userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) throw createError('User not found', 404);
        filter.userId = userId;
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = startDate;
        if (endDate) filter.createdAt.$lte = endDate;
      }

      const analytics = await this.locationRepository.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalUpdates: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            averageAccuracy: { $avg: '$coordinates.accuracy' },
            onlineTime: {
              $sum: { $cond: [{ $eq: ['$isOnline', true] }, 1, 0] }
            },
            averageBatteryLevel: { $avg: '$batteryLevel' },
            networkTypeDistribution: { $push: '$networkType' }
          }
        },
        {
          $project: {
            totalUpdates: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            averageAccuracy: { $round: ['$averageAccuracy', 2] },
            onlinePercentage: {
              $round: [{ $multiply: [{ $divide: ['$onlineTime', '$totalUpdates'] }, 100] }, 2]
            },
            averageBatteryLevel: { $round: ['$averageBatteryLevel', 2] },
            networkTypeDistribution: 1
          }
        }
      ]);

      return analytics[0] || {
        totalUpdates: 0,
        uniqueUsers: 0,
        averageAccuracy: 0,
        onlinePercentage: 0,
        averageBatteryLevel: 0,
        networkTypeDistribution: []
      };
    } catch (error) {
      logger.error('Get location analytics failed:', error);
      throw error;
    }
  }

  /**
   * Generate heatmap data from location distribution within geographical bounds.
   */
  async getDeliveryHeatmap(
    bounds: {
      northEast: { latitude: number; longitude: number };
      southWest: { latitude: number; longitude: number };
    },
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      const filter: any = {
        'coordinates.latitude': {
          $gte: bounds.southWest.latitude,
          $lte: bounds.northEast.latitude
        },
        'coordinates.longitude': {
          $gte: bounds.southWest.longitude,
          $lte: bounds.northEast.longitude
        }
      };

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = startDate;
        if (endDate) filter.createdAt.$lte = endDate;
      }

      const heatmapData = await this.locationRepository.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $match: { 'user.role': 'partner' } }, // Case correction: role usually lowercased in DB
        {
          $group: {
            _id: {
              lat: { $round: ['$coordinates.latitude', 3] },
              lng: { $round: ['$coordinates.longitude', 3] }
            },
            count: { $sum: 1 },
            uniquePartners: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            latitude: '$_id.lat',
            longitude: '$_id.lng',
            intensity: '$count',
            uniquePartners: { $size: '$uniquePartners' }
          }
        },
        { $sort: { intensity: -1 } }
      ]);

      return heatmapData;
    } catch (error) {
      logger.error('Get delivery heatmap failed:', error);
      throw error;
    }
  }

  /**
   * Delete old location records to preserve storage.
   */
  async cleanupOldLocations(daysOld: number = 30): Promise<number> {
    try {
      if (daysOld < 7) throw createError('Cannot delete locations newer than 7 days', HttpStatus.BAD_REQUEST);

      const deletedCount = await this.locationRepository.cleanupOldLocations(daysOld);
      logger.info(`Cleaned up ${deletedCount} old location records older than ${daysOld} days`);
      return deletedCount;
    } catch (error) {
      logger.error('Cleanup old locations failed:', error);
      throw error;
    }
  }

  /**
   * Validate if a location update is logically possible based on last known state.
   */
  async validateLocationUpdate(
    userId: string,
    coordinates: LocationCoordinates
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const lastLocation = await this.locationRepository.getLatestLocation(userId);
      if (!lastLocation) return { isValid: true };

      const timeDiff = Date.now() - lastLocation.createdAt.getTime();
      if (timeDiff < 5000) {
        return { isValid: false, reason: 'Location updates too frequent (min 5s)' };
      }

      const distance = this.calculateDistance(
        lastLocation.coordinates.latitude,
        lastLocation.coordinates.longitude,
        coordinates.latitude,
        coordinates.longitude
      );

      const maxSpeedKmh = 120;
      const maxDistanceKm = (maxSpeedKmh * timeDiff) / (1000 * 60 * 60);

      if (distance > maxDistanceKm) {
        return { isValid: false, reason: 'Location pulse exceeds realistic transit speed' };
      }

      return { isValid: true };
    } catch (error) {
      logger.error('Validate location update failed:', error);
      return { isValid: false, reason: 'Validation system error' };
    }
  }

  /**
   * Internal helper for calculating Haversine distance between two coordinates.
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Find the most suitable delivery partner for a given pickup and delivery route.
   */
  async findOptimalDeliveryPartner(
    pickupLatitude: number,
    pickupLongitude: number,
    deliveryLatitude: number,
    deliveryLongitude: number,
    radiusKm: number = 10
  ): Promise<any> {
    try {
      const nearbyPartners = await this.locationRepository.findNearbyDeliveryPartners(
        pickupLatitude,
        pickupLongitude,
        radiusKm
      );

      if (nearbyPartners.length === 0) return null;

      const scoredPartners = await Promise.all(
        nearbyPartners.map(async (partner) => {
          const pickupDistance = this.calculateDistance(
            pickupLatitude,
            pickupLongitude,
            partner.coordinates.latitude,
            partner.coordinates.longitude
          );

          const deliveryDistance = this.calculateDistance(
            partner.coordinates.latitude,
            partner.coordinates.longitude,
            deliveryLatitude,
            deliveryLongitude
          );

          const rating = 5;

          const distanceScore = (pickupDistance + deliveryDistance) * 0.7;
          const ratingScore = (5 - rating) * 0.2;
          const totalScore = distanceScore + ratingScore;

          return {
            ...partner,
            pickupDistance,
            deliveryDistance,
            rating,
            score: totalScore
          };
        })
      );

      scoredPartners.sort((a, b) => a.score - b.score);
      return scoredPartners[0];
    } catch (error) {
      logger.error('Find optimal delivery partner failed:', error);
      throw error;
    }
  }
}