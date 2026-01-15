import { PaginationOptions, PaginatedResult, Address } from '../../types';
import { IAddress } from '../IModel/IAddress';
import { IUser } from '../IModel/IUser';

export interface IUserService {
  getUserProfile(userId: string): Promise<IUser>;
  updateProfile(userId: string, updateData: any): Promise<IUser>;
  updateUserStatus(userId: string, updateData: { isActive?: boolean; isVerified?: boolean }): Promise<IUser>;
  getAllUsers(pagination: PaginationOptions, filters?: any): Promise<PaginatedResult<IUser>>;
  getUserById(userId: string): Promise<IUser>;
  deactivateUser(userId: string): Promise<IUser>;
  activateUser(userId: string): Promise<IUser>;
  addAddress(userId: string, address: Address): Promise<IAddress>;
  updateAddress(userId: string, addressId: string, address: Address): Promise<IAddress>;
  removeAddress(userId: string, addressId: string): Promise<boolean>;
  getUserAddresses(userId: string): Promise<IAddress[]>;
  getDeliveryPartners(pagination: PaginationOptions, filters?: any): Promise<PaginatedResult<IUser>>;
  updateDeliveryPartnerInfo(userId: string, info: any): Promise<IUser>;
  updateDeliveryPartnerOnlineStatus(userId: string, isOnline: boolean): Promise<IUser | null>;
  findNearbyDeliveryPartners(lantitude: number, longitude: number, radius: number): Promise<IUser[]>;
  verifyDeliveryPartnerDocuments(userId: string): Promise<IUser>;
  searchUsers(searchTerm: string, pagination: PaginationOptions): Promise<PaginatedResult<IUser>>;
  getUserStats(): Promise<any>;
  getUserAddressById(userId: string, addressId: string): Promise<IAddress>;
  setDefaultAddress(userId: string, addressId: string): Promise<IAddress | null>;
}