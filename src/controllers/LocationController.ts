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
import { ResponseMessages } from '../enums/ResponseMessages';
import { HttpStatus } from '../enums/HttpStatus';

/**
 * Controller for location-related operations.
 * Handles real-time tracking, history, and geographical analytics for partners.
 */
@injectable()
export class LocationController {

  constructor(
    @inject('LocationService') private locationService: ILocationService
  ) { }

  /**
   * Update the user's current geographical location.
   */
  updateLocation = asyncHandler(async (req: Request<any, any, UpdateLocationDto>, res: Response, _next: NextFunction) => {
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
      return sendError(res, validation.reason || ResponseMessages.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
    }

    const location = await this.locationService.updateUserLocation(
      userId,
      locationCoords,
      additionalData
    );

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { location });
  });

  /**
   * Get the latest known location for a user.
   */
  getLatestLocation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { userId } = req.params;
    const targetUserId = userId || req.user!.userId;

    const location = await this.locationService.getLatestLocation(targetUserId);

    if (!location) {
      return sendError(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { location });
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

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { result });
  });

  /**
   * Find partners near a specific location.
   */
  findNearbyPartners = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return sendError(res, ResponseMessages.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
    }

    const partners = await this.locationService.findNearbyPartners(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      radius ? parseFloat(radius as string) : 10
    );

    sendSuccess(res, ResponseMessages.NEARBY_PARTNERS_FOUND, { partners });
  });

  /**
   * Track the current location of an active order.
   */
  trackOrder = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { orderId } = req.params;

    const tracking = await this.locationService.trackOrderLocation(orderId);

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, tracking);
  });

  /**
   * Update the online/active status of a partner.
   */
  updateOnlineStatus = asyncHandler(async (req: Request<any, any, OnlineStatusDto>, res: Response, _next: NextFunction) => {
    const userId = req.user!.userId;
    const { isOnline } = req.body;

    await this.locationService.updatePartnerOnlineStatus(userId, isOnline);

    sendSuccess(res, ResponseMessages.ONLINE_STATUS_UPDATED);
  });

  /**
   * Get a list of all currently active partners.
   */
  getActivePartners = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const activePartners = await this.locationService.getActivePartners();

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { activePartners });
  });

  /**
   * Get movement statistics for a partner.
   */
  getMovementStats = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendError(res, ResponseMessages.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
    }

    const targetUserId = userId || req.user!.userId;

    const stats = await this.locationService.getPartnerMovementStats(
      targetUserId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { stats });
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

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { analytics });
  });

  /**
   * Get data for a activity heatmap based on geographical bounds and online partners.
   */
  getActivityHeatmap = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { northEastLat, northEastLng, southWestLat, southWestLng, startDate, endDate } = req.query;

    if (!northEastLat || !northEastLng || !southWestLat || !southWestLng) {
      return sendError(res, ResponseMessages.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
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

    const heatmapData = await this.locationService.getPartnerHeatmap(
      bounds,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { heatmapData });
  });

  /**
   * Clean up old location logs based on age.
   */
  cleanupOldLocations = asyncHandler(async (req: Request<any, any, CleanupOldLocationsDto>, res: Response, _next: NextFunction) => {
    const { daysOld } = req.body;

    const deletedCount = await this.locationService.cleanupOldLocations(daysOld || 30);

    sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { deletedCount });
  });
}