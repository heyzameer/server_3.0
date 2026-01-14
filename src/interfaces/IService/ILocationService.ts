import { LocationCoordinates, PaginationOptions, PaginatedResult } from '../../types';
import { ILocation } from '../IModel/ILocation';

export interface ILocationService {
  updateUserLocation(userId: string, coordinates: LocationCoordinates, additionalData?: any): Promise<ILocation>;
  getLatestLocation(userId: string): Promise<ILocation | null>;
  getLocationHistory(userId: string, startDate?: Date, endDate?: Date, pagination?: PaginationOptions): Promise<PaginatedResult<ILocation> | ILocation[]>;
  findNearbyDeliveryPartners(latitude: number, longitude: number, radiusKm?: number): Promise<any[]>;
  getOrderTrackingLocations(orderId: string): Promise<ILocation[]>;
  updateDeliveryPartnerOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  getActiveDeliveryPartners(): Promise<ILocation[]>;
  getDeliveryPartnerMovementStats(userId: string, startDate: Date, endDate: Date): Promise<any>;
  trackOrderLocation(orderId: string): Promise<{ deliveryPartnerLocation: ILocation | null; locationHistory: ILocation[]; }>;
  getLocationAnalytics(userId?: string, startDate?: Date, endDate?: Date): Promise<any>;
  getDeliveryHeatmap(bounds: any, startDate?: Date, endDate?: Date): Promise<any[]>;
  cleanupOldLocations(daysOld?: number): Promise<number>;
  validateLocationUpdate(userId: string, coordinates: LocationCoordinates): Promise<{ isValid: boolean; reason?: string }>;
  findOptimalDeliveryPartner(pickupLatitude: number, pickupLongitude: number, deliveryLatitude: number, deliveryLongitude: number, radiusKm?: number): Promise<any>;
}