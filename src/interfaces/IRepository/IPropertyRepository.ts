import { IProperty } from '../IModel/IProperty';
import { PaginationOptions, PaginatedResult } from '../../types';

export interface IPropertyRepository {
    create(propertyData: Partial<IProperty>): Promise<IProperty>;
    findById(id: string): Promise<IProperty | null>;
    findByPropertyId(propertyId: string): Promise<IProperty | null>;
    findByPartnerId(partnerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]>;
    update(id: string, updateData: Partial<IProperty>): Promise<IProperty | null>;
    delete(id: string): Promise<IProperty | null>;
    findAll(pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]>;
    findAllWithFilters(pagination: PaginationOptions, filters: any): Promise<PaginatedResult<IProperty>>;

    // Custom queries
    findNear(longitude: number, latitude: number, maxDistanceInMeters: number): Promise<IProperty[]>;
    findByCity(city: string, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]>;
    updateVerificationStatus(id: string, status: string, isVerified: boolean): Promise<IProperty | null>;
    updateDocumentStatus(id: string, section: string, status: string, rejectionReason?: string): Promise<IProperty | null>;
    incrementBookingStats(id: string, statType: 'total' | 'active' | 'completed' | 'canceled'): Promise<void>;
    countByPartnerId(partnerId: string): Promise<number>;
}
