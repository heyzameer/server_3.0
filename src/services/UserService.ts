// import { UserRepository } from '../repositories/UserRepository';
import { UserRole, PaginationOptions, PaginatedResult, Address } from '../types';
import { createError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { injectable, inject } from 'tsyringe';
import { IUserService } from '../interfaces/IService/IUserService';
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { IUser } from '../interfaces/IModel/IUser';
import { comparePassword, hashPassword } from '../utils/helpers';
import { IAddressRepository } from '../interfaces/IRepository/IAddressRepository';
import { IAddress } from '../interfaces/IModel/IAddress';
import { UpdateProfileDto } from '../dtos/user.dto';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';

/**
 * Service for handling user-related operations.
 * Implements profile management, address handling, and role-specific user lookups.
 */
@injectable()
export class UserService implements IUserService {

  constructor(
    @inject('UserRepository') private userRepository: IUserRepository,
    @inject('addressRepository') private addressRepository: IAddressRepository
  ) { }

  /**
   * Get the profile of a specific user.
   * @param userId - The user's ID.
   */
  async getUserProfile(userId: string): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      logger.error('Get user profile failed:', error);
      throw error;
    }
  }

  /**
   * Update a user's profile information, including password changes.
   * @param userId - The user's ID.
   * @param updateData - Data to update.
   */
  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto & { currentPassword?: string; newPassword?: string; password?: string }
  ): Promise<IUser> {

    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (updateData.phone && updateData.phone !== user.phone) {
        const existingUser = await this.userRepository.findByPhone(updateData.phone);
        if (existingUser && existingUser._id.toString() !== userId) {
          throw createError(ResponseMessages.PHONE_ALREADY_REGISTERED, HttpStatus.BAD_REQUEST);
        }
      }

      // Handle password change if requested
      if (updateData.currentPassword || updateData.newPassword) {
        if (!updateData.currentPassword || !updateData.newPassword) {
          throw createError(ResponseMessages.BOTH_PASSWORDS_REQUIRED, HttpStatus.BAD_REQUEST);
        }

        if (!user.password) {
          throw createError(ResponseMessages.NO_PASSWORD_SET, HttpStatus.BAD_REQUEST);
        }

        const isPasswordValid = await comparePassword(updateData.currentPassword, user.password);
        if (!isPasswordValid) {
          throw createError(ResponseMessages.CURRENT_PASSWORD_INCORRECT, HttpStatus.BAD_REQUEST);
        }

        updateData.password = await hashPassword(updateData.newPassword);
      }

      // Cleanup DTO fields before DB update
      const dbUpdateData = { ...updateData };
      delete dbUpdateData.currentPassword;
      delete dbUpdateData.newPassword;

      const updatedUser = await this.userRepository.update(userId, dbUpdateData);
      if (!updatedUser) {
        throw createError(ResponseMessages.PROFILE_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Profile updated for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Update profile failed:', error);
      throw error;
    }
  }

  /**
   * Update user status and roles (Admin only operation).
   */
  async updateUserStatus(
    userId: string,
    updateData: {
      isActive?: boolean;
      isVerified?: boolean;
      role?: UserRole;
    }
  ): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.userRepository.update(userId, updateData);
      if (!updatedUser) {
        throw createError(ResponseMessages.USER_STATUS_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`User status updated for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Update user status failed:', error);
      throw error;
    }
  }

  /**
   * Fetch all users with optional filtering.
   */
  async getAllUsers(
    pagination: PaginationOptions,
    filters?: {
      role?: UserRole;
      isActive?: boolean;
      isVerified?: boolean;
      search?: string;
    }
  ): Promise<PaginatedResult<IUser>> {
    try {
      if (filters?.search) {
        return this.userRepository.searchUsers(filters.search, pagination);
      }

      let result: PaginatedResult<IUser>;

      if (filters?.role) {
        result = await this.userRepository.findByRole(filters.role, pagination);
      } else {
        result = await this.userRepository.findActiveUsers(pagination);
      }

      // TODO: Move these filters into repository level for better performance
      if (filters?.isActive !== undefined || filters?.isVerified !== undefined) {
        result.data = result.data.filter(user => {
          if (filters.isActive !== undefined && user.isActive !== filters.isActive) {
            return false;
          }
          if (filters.isVerified !== undefined && user.isVerified !== filters.isVerified) {
            return false;
          }
          return true;
        });
      }

      return result;
    } catch (error) {
      logger.error('Get all users failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID.
   */
  async getUserById(userId: string): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      logger.error('Get user by ID failed:', error);
      throw error;
    }
  }

  /**
   * Deactivate a user.
   */
  async deactivateUser(userId: string): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.userRepository.update(userId, { isActive: false });
      if (!updatedUser) {
        throw createError(ResponseMessages.DEACTIVATE_USER_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`User deactivated: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Deactivate user failed:', error);
      throw error;
    }
  }

  /**
   * Activate a user.
   */
  async activateUser(userId: string): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.userRepository.update(userId, { isActive: true });
      if (!updatedUser) {
        throw createError(ResponseMessages.ACTIVATE_USER_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`User activated: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Activate user failed:', error);
      throw error;
    }
  }

  /**
   * Add a new address.
   */
  async addAddress(userId: string, address: Address): Promise<IAddress> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const addedaddress = await this.addressRepository.createAddress({
        ...address,
        owner: user._id,
        ownerModel: 'User',
      });

      logger.info(`Address added for user: ${userId}`);
      return addedaddress;
    } catch (error) {
      logger.error('Add address failed:', error);
      throw error;
    }
  }

  /**
   * Get a user's address by its ID.
   */
  async getUserAddressById(userId: string, addressId: string): Promise<IAddress> {
    try {
      const address = await this.addressRepository.findById(addressId);
      if (!address || address.owner?.toString() !== userId) {
        throw createError(ResponseMessages.ADDRESS_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return address;
    } catch (error) {
      logger.error('Get address by ID failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing address.
   */
  async updateAddress(userId: string, addressId: string, newAddress: Address): Promise<IAddress> {
    try {
      const address = await this.addressRepository.findById(addressId);
      if (!address || address.owner?.toString() !== userId) {
        throw createError(ResponseMessages.ADDRESS_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const updatedAddress = await this.addressRepository.updateAddress(userId, addressId, newAddress);
      if (!updatedAddress) {
        throw createError(ResponseMessages.ADDRESS_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Address updated for user: ${userId}`);
      return updatedAddress;
    } catch (error) {
      logger.error('Update address failed:', error);
      throw error;
    }
  }

  /**
   * Remove an address.
   */
  async removeAddress(userId: string, addressId: string): Promise<boolean> {
    try {
      const address = await this.addressRepository.findById(addressId);
      if (!address || address.owner?.toString() !== userId) {
        throw createError(ResponseMessages.ADDRESS_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const isDeleted = await this.addressRepository.deleteAddress(addressId, userId);
      if (!isDeleted) {
        throw createError(ResponseMessages.ADDRESS_REMOVE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Address removed for user: ${userId}`);
      return isDeleted;
    } catch (error) {
      logger.error('Remove address failed:', error);
      throw error;
    }
  }

  /**
   * Set an address as the default.
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<IAddress | null> {
    try {
      const address = await this.addressRepository.findById(addressId);
      if (!address || address.owner?.toString() !== userId) {
        throw createError(ResponseMessages.ADDRESS_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const isSetDefault = await this.addressRepository.setDefaultAddress(userId, addressId, !address.isDefault);
      if (!isSetDefault) {
        throw createError(ResponseMessages.ADDRESS_SET_DEFAULT_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Address set default for user: ${userId}`);
      return isSetDefault;
    } catch (error) {
      logger.error('Set default address failed:', error);
      throw error;
    }
  }

  /**
   * Get all addresses for a user.
   */
  async getUserAddresses(userId: string): Promise<IAddress[]> {
    try {
      const addresses = await this.addressRepository.findByUserId(userId);
      if (!addresses) {
        throw createError(ResponseMessages.ADDRESSES_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return addresses;
    } catch (error) {
      logger.error('Get user addresses failed:', error);
      throw error;
    }
  }

  /**
   * Get delivery partners based on filters.
   */
  async getDeliveryPartners(
    pagination: PaginationOptions,
    filters?: {
      isOnline?: boolean;
      rating?: number;
      documentsVerified?: boolean;
    }
  ): Promise<PaginatedResult<IUser>> {
    try {
      const result = await this.userRepository.findDeliveryPartners(
        filters?.isOnline,
        pagination
      );

      let paginatedResult: PaginatedResult<IUser>;
      if (Array.isArray(result)) {
        paginatedResult = {
          data: result,
          pagination: {
            total: result.length,
            page: pagination.page,
            limit: pagination.limit,
            pages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      } else {
        paginatedResult = result;
      }

      // TODO: Add actual rating/verification logic here
      if (
        (filters?.rating !== undefined || filters?.documentsVerified !== undefined) &&
        paginatedResult.data
      ) {
        paginatedResult.data = paginatedResult.data.filter(user => {
          if (!user) return false;
          // Placeholder for rating logic
          return true;
        });
      }

      return paginatedResult;
    } catch (error) {
      logger.error('Get delivery partners failed:', error);
      throw error;
    }
  }

  /**
   * Update delivery partner information.
   */
  async updateDeliveryPartnerInfo(
    userId: string,
    updateData: {
      vehicleType?: string;
      vehicleNumber?: string;
      licenseNumber?: string;
      licenseExpiry?: Date;
      isOnline?: boolean;
    }
  ): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw createError(ResponseMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (user.role !== UserRole.PARTNER) {
        throw createError(ResponseMessages.NOT_DELIVERY_PARTNER, HttpStatus.BAD_REQUEST);
      }

      const updateFields: any = {};
      Object.keys(updateData).forEach(key => {
        updateFields[`deliveryPartnerInfo.${key}`] = (updateData as any)[key];
      });

      const updatedUser = await this.userRepository.update(userId, updateFields);
      if (!updatedUser) {
        throw createError(ResponseMessages.PARTNER_INFO_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Delivery partner info updated for user: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Update delivery partner info failed:', error);
      throw error;
    }
  }

  /**
   * Update online status for a partner.
   */
  async updateDeliveryPartnerOnlineStatus(userId: string, isOnline: boolean): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || user.role !== UserRole.PARTNER) {
        throw createError(ResponseMessages.VALID_PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.userRepository.updateDeliveryPartnerOnlineStatus(userId, isOnline);
      if (!updatedUser) {
        throw createError(ResponseMessages.ONLINE_STATUS_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Delivery partner online status updated: ${userId} - ${isOnline}`);
      return updatedUser;
    } catch (error) {
      logger.error('Update delivery partner online status failed:', error);
      throw error;
    }
  }

  /**
   * Find delivery partners within a specific radius.
   */
  async findNearbyDeliveryPartners(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<IUser[]> {
    try {
      const deliveryPartners = await this.userRepository.findDeliveryPartnersNearby(
        latitude,
        longitude,
        radiusKm
      );
      return deliveryPartners;
    } catch (error) {
      logger.error('Find nearby delivery partners failed:', error);
      throw error;
    }
  }

  /**
   * Mark delivery partner documents as verified.
   */
  async verifyDeliveryPartnerDocuments(userId: string): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || user.role !== UserRole.PARTNER) {
        throw createError(ResponseMessages.DELIVERY_PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.userRepository.update(userId, {
        'deliveryPartnerInfo.documentsVerified': true,
      });

      if (!updatedUser) {
        throw createError(ResponseMessages.DOCUMENTS_VERIFY_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Delivery partner documents verified: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Verify delivery partner documents failed:', error);
      throw error;
    }
  }

  /**
   * Update the rating for a delivery partner.
   */
  async updateDeliveryPartnerRating(userId: string, newRating: number): Promise<IUser> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || user.role !== UserRole.PARTNER) {
        throw createError(ResponseMessages.DELIVERY_PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.userRepository.updateDeliveryPartnerRating(userId, newRating);
      if (!updatedUser) {
        throw createError(ResponseMessages.RATING_UPDATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      logger.info(`Delivery partner rating updated: ${userId} - ${newRating}`);
      return updatedUser;
    } catch (error) {
      logger.error('Update delivery partner rating failed:', error);
      throw error;
    }
  }

  /**
   * Search for users based on a general search term.
   */
  async searchUsers(searchTerm: string, pagination: PaginationOptions): Promise<PaginatedResult<IUser>> {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw createError(ResponseMessages.SEARCH_TERM_TOO_SHORT, HttpStatus.BAD_REQUEST);
      }

      const result = await this.userRepository.searchUsers(searchTerm.trim(), pagination);
      return result;
    } catch (error) {
      logger.error('Search users failed:', error);
      throw error;
    }
  }

  /**
   * Get high-level statistics about the user base.
   */
  async getUserStats(): Promise<any> {
    try {
      const totalUsers = await this.userRepository.count();
      const activeUsers = await this.userRepository.count({ isActive: true });
      const verifiedUsers = await this.userRepository.count({ isVerified: true });
      const customerCount = await this.userRepository.count({ role: UserRole.CUSTOMER });
      const deliveryPartnerCount = await this.userRepository.count({ role: UserRole.PARTNER });
      const adminCount = await this.userRepository.count({ role: UserRole.ADMIN });
      const onlineDeliveryPartners = await this.userRepository.count({
        role: UserRole.PARTNER,
        'deliveryPartnerInfo.isOnline': true,
      });

      return {
        totalUsers,
        activeUsers,
        verifiedUsers,
        usersByRole: {
          customers: customerCount,
          deliveryPartners: deliveryPartnerCount,
          admins: adminCount,
        },
        onlineDeliveryPartners,
        verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
        activationRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      };
    } catch (error) {
      logger.error('Get user stats failed:', error);
      throw error;
    }
  }
}