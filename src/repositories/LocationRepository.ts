import { BaseRepository } from './BaseRepository';
import { Location, } from '../models/Location';
import { PaginationOptions, PaginatedResult } from '../types';
import mongoose from 'mongoose';
import { injectable } from 'tsyringe';
import { ILocationRepository } from '../interfaces/IRepository/ILocationRepository';
import { ILocation } from '../interfaces/IModel/ILocation';


@injectable()
export class LocationRepository extends BaseRepository<ILocation> implements ILocationRepository {
  constructor() {
    super(Location);
  }

  async getLatestLocation(userId: string): Promise<ILocation | null> {
    return this.findOne({ userId }, { sort: { createdAt: -1 } });
  }

  async updateUserLocation(
    userId: string,
    coordinates: any,
    additionalData?: Partial<ILocation>
  ): Promise<ILocation> {
    const locationData: Partial<ILocation> = {
      userId: new mongoose.Types.ObjectId(userId),
      coordinates,
      ...additionalData,
    };

    return this.create(locationData);
  }

  async getLocationHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ILocation> | ILocation[]> {
    const filter: any = { userId };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }

    return this.find(filter, { sort: { createdAt: -1 } });
  }

  async findNearbyDeliveryPartners(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<any[]> {
    return this.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000, // Convert to meters
          spherical: true,
          query: {
            isOnline: true,
            createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
          }
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $match: {
          'user.role': 'delivery_partner',
          'user.isActive': true,
          'user.deliveryPartnerInfo.isOnline': true,
          'user.deliveryPartnerInfo.documentsVerified': true,
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ['$user', 0] }
        }
      },
      {
        $sort: { distance: 1 },
      },
      {
        $limit: 50 // Limit results for performance
      }
    ]);
  }

  async getOrderTrackingLocations(orderId: string): Promise<ILocation[]> {
    return this.find({ orderId }, { sort: { createdAt: 1 } });
  }

  async updateDeliveryPartnerStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.updateMany({ userId }, { isOnline });
  }

  async getActiveDeliveryPartners(): Promise<ILocation[]> {
    return this.aggregate([
      {
        $match: {
          isOnline: true,
          createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
        },
      },
      {
        $group: {
          _id: '$userId',
          latestLocation: { $last: '$$ROOT' },
        },
      },
      {
        $replaceRoot: { newRoot: '$latestLocation' },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $match: {
          'user.role': 'delivery_partner',
          'user.isActive': true,
          'user.deliveryPartnerInfo.isOnline': true,
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ['$user', 0] }
        }
      }
    ]);
  }

  async getDeliveryPartnerMovementStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    return this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $sort: { createdAt: 1 },
      },
      {
        $setWindowFields: {
          sortBy: { createdAt: 1 },
          output: {
            prevLat: { $shift: { output: '$coordinates.latitude', by: -1 } },
            prevLng: { $shift: { output: '$coordinates.longitude', by: -1 } }
          }
        }
      },
      {
        $addFields: {
          distance: {
            $cond: {
              if: { $and: [{ $ne: ['$prevLat', null] }, { $ne: ['$prevLng', null] }] },
              then: {
                $multiply: [
                  6371, // Earth radius in km
                  {
                    $acos: {
                      $add: [
                        {
                          $multiply: [
                            { $sin: { $multiply: [{ $divide: ['$coordinates.latitude', 57.2958] }, 1] } },
                            { $sin: { $multiply: [{ $divide: ['$prevLat', 57.2958] }, 1] } }
                          ]
                        },
                        {
                          $multiply: [
                            { $cos: { $multiply: [{ $divide: ['$coordinates.latitude', 57.2958] }, 1] } },
                            { $cos: { $multiply: [{ $divide: ['$prevLat', 57.2958] }, 1] } },
                            {
                              $cos: {
                                $multiply: [
                                  { $divide: [{ $subtract: ['$coordinates.longitude', '$prevLng'] }, 57.2958] },
                                  1
                                ]
                              }
                            }
                          ]
                        }
                      ]
                    }
                  }
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalLocations: { $sum: 1 },
          averageSpeed: { $avg: '$speed' },
          maxSpeed: { $max: '$speed' },
          totalDistance: { $sum: '$distance' },
          averageAccuracy: { $avg: '$coordinates.accuracy' },
          averageBatteryLevel: { $avg: '$batteryLevel' },
          onlineTime: {
            $sum: {
              $cond: [{ $eq: ['$isOnline', true] }, 1, 0]
            }
          },
          firstLocation: { $first: '$$ROOT' },
          lastLocation: { $last: '$$ROOT' },
        },
      },
      {
        $addFields: {
          onlinePercentage: {
            $multiply: [
              { $divide: ['$onlineTime', '$totalLocations'] },
              100
            ]
          }
        }
      }
    ]);
  }

  async cleanupOldLocations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    return this.deleteMany({ createdAt: { $lt: cutoffDate } });
  }

  async getLocationsByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<ILocation> | ILocation[]> {
    const filter: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (userId) {
      filter.userId = userId;
    }

    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }

    return this.find(filter, { sort: { createdAt: -1 } });
  }

  async getLocationDensity(
    bounds: {
      northEast: { latitude: number; longitude: number };
      southWest: { latitude: number; longitude: number };
    },
    gridSize: number = 0.01 // Approximately 1km
  ): Promise<any[]> {
    return this.aggregate([
      {
        $match: {
          'coordinates.latitude': {
            $gte: bounds.southWest.latitude,
            $lte: bounds.northEast.latitude
          },
          'coordinates.longitude': {
            $gte: bounds.southWest.longitude,
            $lte: bounds.northEast.longitude
          },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
      },
      {
        $group: {
          _id: {
            lat: {
              $multiply: [
                { $floor: { $divide: ['$coordinates.latitude', gridSize] } },
                gridSize
              ]
            },
            lng: {
              $multiply: [
                { $floor: { $divide: ['$coordinates.longitude', gridSize] } },
                gridSize
              ]
            }
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          avgSpeed: { $avg: '$speed' },
          avgAccuracy: { $avg: '$coordinates.accuracy' }
        }
      },
      {
        $project: {
          latitude: '$_id.lat',
          longitude: '$_id.lng',
          density: '$count',
          uniqueUsers: { $size: '$uniqueUsers' },
          avgSpeed: { $round: ['$avgSpeed', 2] },
          avgAccuracy: { $round: ['$avgAccuracy', 2] }
        }
      },
      {
        $sort: { density: -1 }
      }
    ]);
  }

  async getUserLocationStats(userId: string): Promise<any> {
    return this.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: '$userId',
          totalUpdates: { $sum: 1 },
          firstUpdate: { $min: '$createdAt' },
          lastUpdate: { $max: '$createdAt' },
          averageAccuracy: { $avg: '$coordinates.accuracy' },
          averageSpeed: { $avg: '$speed' },
          maxSpeed: { $max: '$speed' },
          averageBatteryLevel: { $avg: '$batteryLevel' },
          onlineTime: {
            $sum: {
              $cond: [{ $eq: ['$isOnline', true] }, 1, 0]
            }
          },
          networkTypes: { $addToSet: '$networkType' }
        }
      },
      {
        $addFields: {
          onlinePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$onlineTime', '$totalUpdates'] }, 100] },
              2
            ]
          },
          averageAccuracy: { $round: ['$averageAccuracy', 2] },
          averageSpeed: { $round: ['$averageSpeed', 2] },
          averageBatteryLevel: { $round: ['$averageBatteryLevel', 2] }
        }
      }
    ]);
  }

  async getRouteOptimizationData(
    deliveryPartnerIds: string[],
    radiusKm: number = 50
  ): Promise<any[]> {
    return this.aggregate([
      {
        $match: {
          userId: { $in: deliveryPartnerIds.map(id => new mongoose.Types.ObjectId(id)) },
          isOnline: true,
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        }
      },
      {
        $group: {
          _id: '$userId',
          latestLocation: { $last: '$$ROOT' },
          averageSpeed: { $avg: '$speed' },
          batteryLevel: { $last: '$batteryLevel' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $match: {
          'user.role': 'delivery_partner',
          'user.isActive': true,
          'user.deliveryPartnerInfo.isOnline': true
        }
      },
      {
        $project: {
          userId: '$_id',
          location: '$latestLocation.coordinates',
          averageSpeed: { $round: ['$averageSpeed', 2] },
          batteryLevel: 1,
          rating: { $arrayElemAt: ['$user.deliveryPartnerInfo.rating', 0] },
          totalDeliveries: { $arrayElemAt: ['$user.deliveryPartnerInfo.totalDeliveries', 0] }
        }
      }
    ]);
  }
}