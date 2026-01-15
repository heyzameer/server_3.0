import { injectable } from 'tsyringe';
import { FilterQuery, QueryOptions } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Address } from '../models/Address';
// import { PaginationOptions, PaginatedResult } from '../types';
import { IAddress } from '../interfaces/IModel/IAddress';
import { IAddressRepository } from '../interfaces/IRepository/IAddressRepository';

@injectable()
export class AddressRepository extends BaseRepository<IAddress> implements IAddressRepository {
    constructor() {
        super(Address);
    }
    createAddress(data: Partial<IAddress>): Promise<IAddress> {
        const address = new this.model(data);
        return address.save();
    }
    findByUserId(userId: string): Promise<IAddress[]> {
        const query: FilterQuery<IAddress> = { owner: userId };
        return this.model.find(query);
    }
    findById(id: string, options?: QueryOptions): Promise<IAddress | null> {
        const query: FilterQuery<IAddress> = { _id: id };
        return this.model.findOne(query, options);
    }
    updateAddress(userId: string, addressId: string, address: IAddress): Promise<IAddress | null> {
        const query: FilterQuery<IAddress> = { _id: addressId, owner: userId };
        return this.model.findOneAndUpdate(query, address, { new: true });
    }
    deleteAddress(id: string, userId: string): Promise<boolean> {
        const query: FilterQuery<IAddress> = { _id: id, owner: userId };
        return this.model.deleteOne(query).then((result) => result.deletedCount > 0);
    }
    async setDefaultAddress(userId: string, addressId: string, isDefault: boolean): Promise<IAddress | null> {
        const query: FilterQuery<IAddress> = { _id: addressId, owner: userId };
        await this.model.updateMany({ owner: userId, isDefault: true }, { $set: { isDefault: false } });
        return this.model.findOneAndUpdate(query, { isDefault: isDefault }, { new: true });
    }



}