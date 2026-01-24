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
import { ResponseMessages } from "../enums/ResponseMessages";
import { HttpStatus } from "../enums/HttpStatus";

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

      sendSuccess(res, ResponseMessages.PROFILE_RETRIEVED, { user });
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

      sendSuccess(res, ResponseMessages.PROFILE_UPDATED, { user });
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

      sendSuccess(res, ResponseMessages.USERS_RETRIEVED, result);
    }
  );

  /**
   * Get a specific user by ID.
   */
  getUserById = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

      sendSuccess(res, ResponseMessages.USER_RETRIEVED, { user });
    }
  );

  /**
   * Deactivate a user account.
   */
  deactivateUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.deactivateUser(id);

      sendSuccess(res, ResponseMessages.USER_DEACTIVATED, { user });
    }
  );

  /**
   * Activate a user account.
   */
  activateUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.activateUser(id);

      sendSuccess(res, ResponseMessages.USER_ACTIVATED, { user });
    }
  );

  /**
   * Add a new address for the user.
   */
  addAddress = asyncHandler(
    async (req: Request<any, any, AddAddressDto>, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const user = await this.userService.addAddress(userId, req.body);

      sendSuccess(res, ResponseMessages.ADDRESS_ADDED, { user }, HttpStatus.CREATED);
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

      sendSuccess(res, ResponseMessages.ADDRESS_UPDATED, { user });
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

      sendSuccess(res, ResponseMessages.ADDRESS_REMOVED, { isDeleted });
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

      sendSuccess(res, ResponseMessages.ADDRESS_SET_DEFAULT, { user });
    }
  );

  /**
   * Get all addresses for the current user.
   */
  getAddresses = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const addresses = await this.userService.getUserAddresses(userId);

      sendSuccess(res, ResponseMessages.ADDRESSES_RETRIEVED, { addresses });
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

      sendSuccess(res, ResponseMessages.ADDRESS_RETRIEVED, { address });
    }
  );

  /**
   * Get partners with filtering.
   */
  getPartners = asyncHandler(
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

      const result = await this.userService.getPartners(
        pagination,
        filters
      );

      sendSuccess(res, ResponseMessages.PARTNERS_RETRIEVED, result);
    }
  );

  /**
   * Update partner information.
   */
  updatePartnerInfo = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const user = await this.userService.updatePartnerInfo(
        userId,
        req.body
      );

      sendSuccess(res, ResponseMessages.PARTNER_UPDATED, { user });
    }
  );

  /**
   * Update the online status of a partner.
   */
  updateOnlineStatus = asyncHandler(
    async (req: Request<any, any, UpdateOnlineStatusDto>, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const { isOnline } = req.body;
      const user = await this.userService.updatePartnerOnlineStatus(
        userId,
        isOnline
      );

      sendSuccess(res, ResponseMessages.ONLINE_STATUS_UPDATED, { user });
    }
  );

  /**
   * Find nearby partners.
   */
  findNearbyPartners = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { latitude, longitude, radius } = req.query;

      const partners =
        await this.userService.findNearbyPartners(
          parseFloat(latitude as string),
          parseFloat(longitude as string),
          radius ? parseFloat(radius as string) : 10
        );

      sendSuccess(res, ResponseMessages.NEARBY_PARTNERS_FOUND, { partners });
    }
  );

  /**
   * Verify partner documents.
   */
  verifyPartnerDocuments = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const user = await this.userService.verifyPartnerDocuments(id);

      sendSuccess(res, ResponseMessages.DOCUMENTS_VERIFIED, { user });
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
        return sendError(res, ResponseMessages.SEARCH_TERM_REQUIRED, HttpStatus.BAD_REQUEST);
      }

      const result = await this.userService.searchUsers(
        search as string,
        pagination
      );

      sendSuccess(res, ResponseMessages.USERS_RETRIEVED, result);
    }
  );

  /**
   * Get overall user statistics.
   */
  getUserStats = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const stats = await this.userService.getUserStats();

      sendSuccess(res, ResponseMessages.USER_STATS_RETRIEVED, { stats });
    }
  );
}
