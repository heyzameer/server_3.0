import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { IBooking } from '../interfaces/IModel/IBooking';
import { Booking } from '../models/Booking';
import { IBookingRepository } from '../interfaces/IRepository/IBookingRepository';
import { FilterQuery } from 'mongoose';
import mongoose from 'mongoose';

@injectable()
export class BookingRepository extends BaseRepository<IBooking> implements IBookingRepository {
    constructor() {
        super(Booking);
    }

    async findByPartnerId(partnerId: string, filters: any = {}): Promise<IBooking[]> {
        const query: FilterQuery<IBooking> = { partnerId: new mongoose.Types.ObjectId(partnerId), ...filters };
        console.log('📊 BookingRepository.findByPartnerId query:', JSON.stringify(query, null, 2));

        const results = await this.model.find(query)
            .populate('userId', 'fullName email phone')
            .populate('propertyId', 'propertyName')
            .populate('roomBookings.roomId', 'roomName')
            .sort({ createdAt: -1 });

        console.log('📊 BookingRepository.findByPartnerId results:', results.length);
        return results;
    }

    async findByUserId(userId: string): Promise<IBooking[]> {
        return this.model.find({ userId })
            .populate('propertyId', 'propertyName address city')
            .populate('roomBookings.roomId', 'roomName')
            .sort({ createdAt: -1 });
    }

    async countDocuments(filter: FilterQuery<IBooking>): Promise<number> {
        return this.model.countDocuments(filter);
    }
}
