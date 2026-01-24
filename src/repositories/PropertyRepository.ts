import { injectable } from 'tsyringe';
import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Property } from '../models/Property';
import { IProperty } from '../interfaces/IModel/IProperty';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { PaginationOptions, PaginatedResult } from '../types';

@injectable()
export class PropertyRepository extends BaseRepository<IProperty> implements IPropertyRepository {
    constructor() {
        super(Property);
    }

    async findByPropertyId(propertyId: string): Promise<IProperty | null> {
        return this.model.findOne({ propertyId }).exec();
    }

    async findByPartnerId(partnerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]> {
        const filter = { partnerId };
        if (pagination) {
            return this.findWithPagination(filter, pagination);
        }
        return this.find(filter);
    }

    async findAll(pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]> {
        if (pagination) {
            return this.findWithPagination({}, pagination);
        }
        return this.find({});
    }

    async findAllWithFilters(pagination: PaginationOptions, filters: any): Promise<PaginatedResult<IProperty>> {
        const query: FilterQuery<IProperty> = {};

        // Status/Verification filters
        if (filters.status) {
            query.verificationStatus = filters.status;
        }
        if (filters.verificationStatus) {
            query.verificationStatus = filters.verificationStatus;
        }
        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        }
        if (filters.isVerified !== undefined) {
            query.isVerified = filters.isVerified;
        }

        // Property type filter
        if (filters.propertyType) {
            query.propertyType = filters.propertyType;
        }

        // City filter
        if (filters.city) {
            query['address.city'] = { $regex: new RegExp(filters.city, 'i') };
        }

        // Search filter (search in propertyName or city)
        if (filters.search) {
            query.$or = [
                { propertyName: { $regex: new RegExp(filters.search, 'i') } },
                { 'address.city': { $regex: new RegExp(filters.search, 'i') } },
                { description: { $regex: new RegExp(filters.search, 'i') } }
            ];
        }

        // Use findWithPagination from BaseRepository
        return this.findWithPagination(query, pagination, 'partnerId');
    }

    async findNear(longitude: number, latitude: number, maxDistanceInMeters: number): Promise<IProperty[]> {
        return this.model.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: maxDistanceInMeters
                }
            },
            isActive: true,
            isVerified: true
        }).exec();
    }

    async findByCity(city: string, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]> {
        const filter = { 'address.city': { $regex: new RegExp(city, 'i') }, isActive: true, isVerified: true };
        if (pagination) {
            return this.findWithPagination(filter, pagination);
        }
        return this.find(filter);
    }

    async updateVerificationStatus(id: string, verificationStatus: string, isVerified: boolean): Promise<IProperty | null> {
        return this.update(id, { verificationStatus, isVerified } as any);
    }

    async updateDocumentStatus(id: string, section: string, status: string, rejectionReason?: string): Promise<IProperty | null> {
        const updateData: any = {};

        switch (section) {
            case 'ownership':
                updateData['ownershipDocuments.ownershipProofStatus'] = status;
                updateData['ownershipDocuments.ownerKYCStatus'] = status;
                if (rejectionReason) updateData['ownershipDocuments.rejectionReason'] = rejectionReason;
                break;
            case 'tax':
                updateData['taxDocuments.taxStatus'] = status;
                if (rejectionReason) updateData['taxDocuments.rejectionReason'] = rejectionReason;
                break;
            case 'banking':
                updateData['bankingDetails.bankingStatus'] = status;
                if (rejectionReason) updateData['bankingDetails.rejectionReason'] = rejectionReason;
                break;
        }

        return this.model.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
    }

    async incrementBookingStats(id: string, statType: 'total' | 'active' | 'completed' | 'canceled'): Promise<void> {
        const fieldMap = {
            total: 'totalBookings',
            active: 'activeBookings',
            completed: 'completedBookings',
            canceled: 'canceledBookings'
        };
        const field = fieldMap[statType];
        await this.model.findByIdAndUpdate(id, { $inc: { [field]: 1 } }).exec();
    }

    async countByPartnerId(partnerId: string): Promise<number> {
        return this.model.countDocuments({ partnerId }).exec();
    }
}
