import { IBooking } from '../IModel/IBooking';
import { FilterQuery, QueryOptions } from 'mongoose';
import { PaginationOptions, PaginatedResult } from '../../types';

export interface IBookingRepository {
    create(data: Partial<IBooking>): Promise<IBooking>;
    findById(id: string, options?: QueryOptions): Promise<IBooking | null>;
    findOne(filter: FilterQuery<IBooking>, options?: QueryOptions): Promise<IBooking | null>;
    find(filter: FilterQuery<IBooking>, options?: QueryOptions): Promise<IBooking[]>;
    findByPartnerId(partnerId: string, filters?: any): Promise<IBooking[]>;
    findByUserId(userId: string): Promise<IBooking[]>;
    update(id: string, data: Partial<IBooking>, options?: QueryOptions): Promise<IBooking | null>;
    delete(id: string): Promise<IBooking | null>;
    countDocuments(filter: FilterQuery<IBooking>): Promise<number>;
    findWithPagination(filter: FilterQuery<IBooking>, pagination: PaginationOptions): Promise<PaginatedResult<IBooking>>;
}
