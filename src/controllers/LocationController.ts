import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { sendError, sendSuccess } from '../utils/response';
import { inject, injectable } from 'tsyringe';
import { ILocationService } from '../interfaces/IService/ILocationService';
import {
  UpdateLocationDto,
  OnlineStatusDto,
  CleanupOldLocationsDto
} from '../dtos/location.dto';
import { LocationCoordinates } from '../types';

/**
 * Controller for location-related operations.
 * Handles real-time tracking, history, and geographical analytics for delivery partners.
 */
@injectable()
export class LocationController {

  constructor(
    @inject('LocationService') private locationService: ILocationService
  ) { }

  /**
   * Update the user's current geographical location.
   */
  updateLocation = asyncHandler(async (req: Request<{}, {}, UpdateLocationDto>, res: Response, _next: NextFunction) => {
    const userId = req.user!.userId;
    const { coordinates, ...additionalData } = req.body;

    const locationCoords: LocationCoordinates = {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      accuracy: coordinates.accuracy,
      timestamp: coordinates.timestamp ? new Date(coordinates.timestamp) : new Date()
    };

    const validation = await this.locationService.validateLocationUpdate(userId, locationCoords);
    if (!validation.isValid) {
      return sendError(res, validation.reason || 'Invalid location update', 400);
    }

    const location = await this.locationService.updateUserLocation(
      userId,
      locationCoords,
      additionalData
    );

    sendSuccess(res, 'Location updated successfully', { location });
  });

  /**
   * Get the latest known location for a user.
   */
  getLatestLocation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { userId } = req.params;
    const targetUserId = userId || req.user!.userId;

    const location = await this.locationService.getLatestLocation(targetUserId);

    if (!location) {
      return sendError(res, 'No location found', 404);
    }

    sendSuccess(res, 'Latest location retrieved successfully', { location });
  });

  /**
   * Get location history for a user within a specific time range.
   */
  getLocationHistory = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const pagination = req.pagination;

    const targetUserId = userId || req.user!.userId;

    const result = await this.locationService.getLocationHistory(
      targetUserId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      pagination
    );

    sendSuccess(res, 'Location history retrieved successfully', { result });
  });

  /**
   * Find delivery partners near a specific location.
   */
  findNearbyDeliveryPartners = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return sendError(res, 'Latitude and longitude are required', 400);
    }

    const deliveryPartners = await this.locationService.findNearbyDeliveryPartners(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      radius ? parseFloat(radius as string) : 10
    );

    sendSuccess(res, 'Nearby delivery partners found', { deliveryPartners });
  });

  /**
   * Track the current location of an active order.
   */
  trackOrder = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;

    const tracking = await this.locationService.trackOrderLocation(orderId);

    sendSuccess(res, 'Order tracking retrieved successfully', tracking);
  });

  /**
   * Update the online/active status of a delivery partner.
   */
  updateOnlineStatus = asyncHandler(async (req: Request<{}, {}, OnlineStatusDto>, res: Response, _next: NextFunction) => {
    const userId = req.user!.userId;
    const { isOnline } = req.body;

    await this.locationService.updateDeliveryPartnerOnlineStatus(userId, isOnline);

    sendSuccess(res, 'Online status updated successfully');
  });

  /**
   * Get a list of all currently active delivery partners.
   */
  getActiveDeliveryPartners = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const activePartners = await this.locationService.getActiveDeliveryPartners();

    sendSuccess(res, 'Active delivery partners retrieved successfully', { activePartners });
  });

  /**
   * Get movement statistics for a delivery partner.
   */
  getMovementStats = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendError(res, 'Start date and end date are required', 400);
    }

    const targetUserId = userId || req.user!.userId;

    const stats = await this.locationService.getDeliveryPartnerMovementStats(
      targetUserId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    sendSuccess(res, 'Movement statistics retrieved successfully', { stats });
  });

  /**
   * Get overall location analytics for a user or system.
   */
  getLocationAnalytics = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { userId, startDate, endDate } = req.query;

    const analytics = await this.locationService.getLocationAnalytics(
      userId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    sendSuccess(res, 'Location analytics retrieved successfully', { analytics });
  });

  /**
   * Get data for a delivery heatmap based on geographical bounds.
   */
  getDeliveryHeatmap = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { northEastLat, northEastLng, southWestLat, southWestLng, startDate, endDate } = req.query;

    if (!northEastLat || !northEastLng || !southWestLat || !southWestLng) {
      return sendError(res, 'Bounds coordinates are required', 400);
    }

    const bounds = {
      northEast: {
        latitude: parseFloat(northEastLat as string),
        longitude: parseFloat(northEastLng as string)
      },
      southWest: {
        latitude: parseFloat(southWestLat as string),
        longitude: parseFloat(southWestLng as string)
      }
    };

    const heatmapData = await this.locationService.getDeliveryHeatmap(
      bounds,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    sendSuccess(res, 'Delivery heatmap data retrieved successfully', { heatmapData });
  });

  /**
   * Clean up old location logs based on age.
   */
  cleanupOldLocations = asyncHandler(async (req: Request<{}, {}, CleanupOldLocationsDto>, res: Response, _next: NextFunction) => {
    const { daysOld } = req.body;

    const deletedCount = await this.locationService.cleanupOldLocations(daysOld || 30);

    sendSuccess(res, 'Old locations cleaned up successfully', { deletedCount });
  });
}