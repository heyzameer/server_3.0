import { FilterQuery } from 'mongoose';
import { UserRole, PaginationOptions, PaginatedResult, Address } from '../../types';
import { IUser } from '../IModel/IUser';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string): Promise<IUser | null>;
  findByEmailOrPhone(email: string, phone: string): Promise<IUser | null>;
  create(userData: Partial<IUser>): Promise<IUser>;
  update(id: string, data: any): Promise<IUser | null>;
  findActiveUsers(pagination: PaginationOptions): Promise<PaginatedResult<IUser>>;
  findByRole(role: UserRole, pagination: PaginationOptions): Promise<PaginatedResult<IUser>>;
  addAddress(userId: string, address: Address): Promise<IUser | null>;
  updateAddress(userId: string, addressId: string, address: Address): Promise<IUser | null>;
  removeAddress(userId: string, addressId: string): Promise<IUser | null>;
  updateDeliveryPartnerOnlineStatus(userId: string, isOnline: boolean): Promise<IUser | null>;
  searchUsers(searchTerm: string, pagination: PaginationOptions): Promise<PaginatedResult<IUser>>;
  updateLastLogin(userId: string): Promise<IUser | null>;
  verifyEmail(userId: string): Promise<IUser | null>;
  verifyPhone(userId: string): Promise<IUser | null>;
  findDeliveryPartners(isOnline?: boolean,pagination?: PaginationOptions): Promise<PaginatedResult<IUser> | IUser[]>;
  findDeliveryPartnersNearby( latitude: number,longitude: number,radiusKm?: number): Promise<IUser[]>;
  updateDeliveryPartnerRating(userId: string, newRating: number): Promise<IUser | null>;
  count(filter?: FilterQuery<IUser>): Promise<number>;
}