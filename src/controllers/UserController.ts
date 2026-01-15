import { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { asyncHandler } from "../utils/errorHandler";
import { UserRole } from "../types";
import { injectable, inject } from "tsyringe";
import { IUserService } from "../interfaces/IService/IUserService";
import {
  UpdateProfileDto,
  AddAddressDto,
  UpdateAddressDto,
  UpdateOnlineStatusDto
} from "../dtos/user.dto";

/**
 * Controller for user-related operations.
 * Handles profiles, addresses, and user-specific partner settings.
 */
@injectable()
export class UserController {
  constructor(@inject("UserService") private userService: IUserService) { }

  /**
   * Get the current user's profile.
   */
  getProfile = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const user = await this.userService.getUserProfile(userId);

      sendSuccess(res, "Profile retrieved successfully", { user });
    }
  );

  /**
   * Update the current user's profile.
   */
  updateProfile = asyncHandler(
    async (req: Request<any, any, UpdateProfileDto>, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const files = req.files as
        | Express.Multer.File[]
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      let profilePicture: string | undefined;

      if (Array.isArray(files)) {
        const file = files[0] as Express.MulterS3.File;
        profilePicture = file?.location;
      } else if (files && "profileImage" in files) {
        const fileArr = files["profileImage"] as Express.MulterS3.File[];
        profilePicture = fileArr?.[0]?.location;
      }

      const updateData = {
        ...req.body,
        profilePicture,
      };

      const user = await this.userService.updateProfile(userId, updateData);

      sendSuccess(res, "Profile updated successfully", { user });
    }
  );

  /**
   * Get all users with filtering and pagination.
   */
  getAllUsers = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const pagination = req.pagination!;
      const filters = {
        role: req.query.role as UserRole,
        isActive: req.query.isActive
          ? req.query.isActive === "true"
          : undefined,
        isVerified: req.query.isVerified
          ? req.query.isVerified === "true"
          : undefined,
        search: req.query.search as string,
      };

      const result = await this.userService.getAllUsers(pagination, filters);

      sendSuccess(res, "Users retrieved successfully", result);
    }
  );

  /**
   * Get a specific user by ID.
   */
  getUserById = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

      sendSuccess(res, "User retrieved successfully", { user });
    }
  );

  /**
   * Deactivate a user account.
   */
  deactivateUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.deactivateUser(id);

      sendSuccess(res, "User deactivated successfully", { user });
    }
  );

  /**
   * Activate a user account.
   */
  activateUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.activateUser(id);

      sendSuccess(res, "User activated successfully", { user });
    }
  );

  /**
   * Add a new address for the user.
   */
  addAddress = asyncHandler(
    async (req: Request<any, any, AddAddressDto>, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const user = await this.userService.addAddress(userId, req.body);

      sendSuccess(res, "Address added successfully", { user });
    }
  );

  /**
   * Update an existing address.
   */
  updateAddress = asyncHandler(
    async (req: Request<{ id: string }, any, UpdateAddressDto>, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const user = await this.userService.updateAddress(
        userId,
        id,
        req.body
      );

      sendSuccess(res, "Address updated successfully", { user });
    }
  );

  /**
   * Remove a user address.
   */
  removeAddress = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const isDeleted = await this.userService.removeAddress(userId, id);

      sendSuccess(res, "Address removed successfully", { isDeleted });
    }
  );

  /**
   * Set a default address.
   */
  setDefaultAddress = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const user = await this.userService.setDefaultAddress(userId, id);

      sendSuccess(res, "Default address set successfully", { user });
    }
  );

  /**
   * Get all addresses for the current user.
   */
  getAddresses = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const addresses = await this.userService.getUserAddresses(userId);

      sendSuccess(res, "Addresses retrieved successfully", { addresses });
    }
  );

  /**
   * Get a specific address by ID.
   */
  getAddressById = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const address = await this.userService.getUserAddressById(
        userId,
        id
      );

      sendSuccess(res, "Address retrieved successfully", { address });
    }
  );

  /**
   * Get delivery partners with filtering.
   */
  getDeliveryPartners = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const pagination = req.pagination!;
      const filters = {
        isOnline: req.query.isOnline
          ? req.query.isOnline === "true"
          : undefined,
        rating: req.query.rating
          ? parseFloat(req.query.rating as string)
          : undefined,
        documentsVerified: req.query.documentsVerified
          ? req.query.documentsVerified === "true"
          : undefined,
      };

      const result = await this.userService.getDeliveryPartners(
        pagination,
        filters
      );

      sendSuccess(res, "Delivery partners retrieved successfully", result);
    }
  );

  /**
   * Update delivery partner information.
   */
  updateDeliveryPartnerInfo = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const user = await this.userService.updateDeliveryPartnerInfo(
        userId,
        req.body
      );

      sendSuccess(res, "Delivery partner info updated successfully", { user });
    }
  );

  /**
   * Update the online status of a delivery partner.
   */
  updateOnlineStatus = asyncHandler(
    async (req: Request<any, any, UpdateOnlineStatusDto>, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const { isOnline } = req.body;
      const user = await this.userService.updateDeliveryPartnerOnlineStatus(
        userId,
        isOnline
      );

      sendSuccess(res, "Online status updated successfully", { user });
    }
  );

  /**
   * Find nearby delivery partners.
   */
  findNearbyDeliveryPartners = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { latitude, longitude, radius } = req.query;

      const deliveryPartners =
        await this.userService.findNearbyDeliveryPartners(
          parseFloat(latitude as string),
          parseFloat(longitude as string),
          radius ? parseFloat(radius as string) : 10
        );

      sendSuccess(res, "Nearby delivery partners found", { deliveryPartners });
    }
  );

  /**
   * Verify delivery partner documents.
   */
  verifyDeliveryPartnerDocuments = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.verifyDeliveryPartnerDocuments(id);

      sendSuccess(res, "Documents verified successfully", { user });
    }
  );

  /**
   * Search for users based on a term.
   */
  searchUsers = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { search } = req.query;
      const pagination = req.pagination!;

      if (!search) {
        return sendError(res, "Search term is required", 400);
      }

      const result = await this.userService.searchUsers(
        search as string,
        pagination
      );

      sendSuccess(res, "Users found", result);
    }
  );

  /**
   * Get overall user statistics.
   */
  getUserStats = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const stats = await this.userService.getUserStats();

      sendSuccess(res, "User statistics retrieved successfully", { stats });
    }
  );
}
