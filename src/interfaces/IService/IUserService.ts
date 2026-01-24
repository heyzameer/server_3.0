import { PaginationOptions, PaginatedResult, Address } from '../../types';
import { IAddress } from '../IModel/IAddress';
import { IUser } from '../IModel/IUser';

export interface IUserService {
  getUserProfile(userId: string): Promise<IUser>;
  updateProfile(userId: string, updateData: any): Promise<IUser>;
  updateUserStatus(userId: string, updateData: { isActive?: boolean; isVerified?: boolean }): Promise<IUser>;
  getAllUsers(pagination: PaginationOptions, filters?: any): Promise<PaginatedResult<IUser>>;
  getUserById(userId: string): Promise<IUser>;
  getUserWithBookings(userId: string): Promise<any>;
  deactivateUser(userId: string): Promise<IUser>;
  activateUser(userId: string): Promise<IUser>;
  addAddress(userId: string, address: Address): Promise<IAddress>;
  updateAddress(userId: string, addressId: string, address: Address): Promise<IAddress>;
  removeAddress(userId: string, addressId: string): Promise<boolean>;
  getUserAddresses(userId: string): Promise<IAddress[]>;
  getPartners(pagination: PaginationOptions, filters?: any): Promise<PaginatedResult<IUser>>;
  updatePartnerInfo(userId: string, info: any): Promise<IUser>;
  updatePartnerOnlineStatus(userId: string, isOnline: boolean): Promise<IUser | null>;
  findNearbyPartners(lantitude: number, longitude: number, radius: number): Promise<IUser[]>;
  verifyPartnerDocuments(userId: string): Promise<IUser>;
  searchUsers(searchTerm: string, pagination: PaginationOptions): Promise<PaginatedResult<IUser>>;
  getUserStats(): Promise<any>;
  getUserAddressById(userId: string, addressId: string): Promise<IAddress>;
  setDefaultAddress(userId: string, addressId: string): Promise<IAddress | null>;
}