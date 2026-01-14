import { injectable } from 'tsyringe';
import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { User} from '../models/User';
import { UserRole, PaginationOptions, PaginatedResult } from '../types';
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { IUser } from '../interfaces/IModel/IUser';

@injectable()
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
  return this.model.findOne({ email: email.toLowerCase() }).select('+password').exec() as Promise<IUser | null>;
}

  async findByPhone(phone: string): Promise<IUser | null> {
    return this.model.findOne({ phone });
  }

  async findByEmailOrPhone(email: string, phone: string): Promise<IUser | null> {
    return this.model.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });
  }

  async findActiveUsers(pagination: PaginationOptions): Promise<PaginatedResult<IUser>> {
    return this.findWithPagination({ isActive: true }, pagination);
  }

  async findByRole(role: UserRole, pagination: PaginationOptions): Promise<PaginatedResult<IUser>> {
    return this.findWithPagination({ role, }, pagination);
  }


  async findDeliveryPartners(
    isOnline?: boolean,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<IUser> | IUser[]> {
    const filter: FilterQuery<IUser> = {
      role: UserRole.PARTNER,
      isActive: true,
      'deliveryPartnerInfo.documentsVerified': true,
    };

    if (isOnline !== undefined) {
      filter['deliveryPartnerInfo.isOnline'] = isOnline;
    }

    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }

    return this.find(filter);
  }

  async findDeliveryPartnersNearby(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<IUser[]> {
  return (this.model as any).findDeliveryPartnersNearby(latitude, longitude, radiusKm);
}

  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.update(userId, { lastLoginAt: new Date() });
  }

  async updateDeliveryPartnerOnlineStatus(userId: string, isOnline: boolean): Promise<IUser | null> {
    return this.update(userId, {
      'deliveryPartnerInfo.isOnline': isOnline,
      'deliveryPartnerInfo.lastLocationUpdate': new Date(),
    });
  }

  async updateDeliveryPartnerRating(userId: string, newRating: number): Promise<IUser | null> {
    const user = await this.findById(userId);
    if (!user || user.role !== UserRole.PARTNER) {
      throw new Error('Delivery partner not found');
    }

    const currentRating = 3
    const totalDeliveries =   0;
    
    // Calculate new average rating
    const updatedRating = ((currentRating * totalDeliveries) + newRating) / (totalDeliveries + 1);

    return this.update(userId, {
      'deliveryPartnerInfo.rating': updatedRating,
      'deliveryPartnerInfo.totalDeliveries': totalDeliveries + 1,
    });
  }

  async searchUsers(searchTerm: string, pagination: PaginationOptions): Promise<PaginatedResult<IUser>> {
    const filter: FilterQuery<IUser> = {
      isActive: true,
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } },
      ],
    };

    return this.findWithPagination(filter, pagination);
  }

  async addAddress(userId: string, address: any): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(
      userId,
      { $push: { addresses: address } },
      { new: true }
    );
  }

  async updateAddress(userId: string, addressId: string, address: any): Promise<IUser | null> {
    return this.model.findOneAndUpdate(
      { _id: userId, 'addresses._id': addressId },
      { $set: { 'addresses.$': { ...address, _id: addressId } } },
      { new: true }
    );
  }

  async removeAddress(userId: string, addressId: string): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(
      userId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );
  }

  async verifyEmail(userId: string): Promise<IUser | null> {
    return this.update(userId, {
      isVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  async verifyPhone(userId: string): Promise<IUser | null> {
    return this.update(userId, {
      phoneVerifiedAt: new Date(),
    });
  }
}