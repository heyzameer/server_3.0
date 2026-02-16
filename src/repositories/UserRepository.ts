import { injectable } from 'tsyringe';
import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { User } from '../models/User';
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


  async findPartners(
    isOnline?: boolean,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<IUser> | IUser[]> {
    const filter: FilterQuery<IUser> = {
      role: UserRole.PARTNER,
      isActive: true,
      'partnerInfo.documentsVerified': true,
    };

    if (isOnline !== undefined) {
      filter['partnerInfo.isOnline'] = isOnline;
    }

    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }

    return this.find(filter);
  }

  async findPartnersNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<IUser[]> {
    return (this.model as any).findPartnersNearby(latitude, longitude, radiusKm);
  }

  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.update(userId, { lastLoginAt: new Date() });
  }

  async updatePartnerOnlineStatus(userId: string, isOnline: boolean): Promise<IUser | null> {
    return this.update(userId, {
      'partnerInfo.isOnline': isOnline,
      'partnerInfo.lastLocationUpdate': new Date(),
    });
  }

  async updatePartnerRating(userId: string, newRating: number): Promise<IUser | null> {
    const user = await this.findById(userId);
    if (!user || user.role !== UserRole.PARTNER) {
      throw new Error('Partner not found');
    }

    const currentRating = 3
    const totalBookings = 0;

    // Calculate new average rating
    const updatedRating = ((currentRating * totalBookings) + newRating) / (totalBookings + 1);

    return this.update(userId, {
      'partnerInfo.rating': updatedRating,
      'partnerInfo.totalBookings': totalBookings + 1,
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