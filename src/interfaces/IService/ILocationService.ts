import { LocationCoordinates, PaginationOptions, PaginatedResult } from '../../types';
import { ILocation } from '../IModel/ILocation';

export interface ILocationService {
  updateUserLocation(userId: string, coordinates: LocationCoordinates, additionalData?: any): Promise<ILocation>;
  getLatestLocation(userId: string): Promise<ILocation | null>;
  getLocationHistory(userId: string, startDate?: Date, endDate?: Date, pagination?: PaginationOptions): Promise<PaginatedResult<ILocation> | ILocation[]>;
  findNearbyPartners(latitude: number, longitude: number, radiusKm?: number): Promise<any[]>;
  getOrderTrackingLocations(orderId: string): Promise<ILocation[]>;
  updatePartnerOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  getActivePartners(): Promise<ILocation[]>;
  getPartnerMovementStats(userId: string, startDate: Date, endDate: Date): Promise<any>;
  trackOrderLocation(orderId: string): Promise<{ partnerLocation: ILocation | null; locationHistory: ILocation[]; }>;
  getLocationAnalytics(userId?: string, startDate?: Date, endDate?: Date): Promise<any>;
  getPartnerHeatmap(bounds: any, startDate?: Date, endDate?: Date): Promise<any[]>;
  cleanupOldLocations(daysOld?: number): Promise<number>;
  validateLocationUpdate(userId: string, coordinates: LocationCoordinates): Promise<{ isValid: boolean; reason?: string }>;
  findOptimalPartner(checkInLatitude: number, checkInLongitude: number, checkOutLatitude: number, checkOutLongitude: number, radiusKm?: number): Promise<any>;
}