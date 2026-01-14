import { IUserService } from "../interfaces/IService/IUserService";
import { IAuthService } from "../interfaces/IService/IAuthService";
import { asyncHandler } from "../utils/errorHandler";
import { sendSuccess } from "../utils/response";
import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import { IPartnerService } from "../interfaces/IService/IPartnerService";

/**
 * Controller for admin-related operations.
 * Handles user management, partner verification, and system administration.
 */
@injectable()
export class AdminController {
  constructor(
    @inject("AuthService") private authService: IAuthService,
    @inject("UserService") private userService: IUserService,
    @inject("PartnerService") private partnerService: IPartnerService
  ) { }

  /**
   * Handle admin login and issue tokens.
   */
  adminLogin = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } =
        await this.authService.adminLogin(email, password);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      sendSuccess(res, "Admin login successful", {
        user,
        accessToken,
        refreshToken,
      });
    }
  );

  /** 
   * Get all users with pagination and optional filtering by role.
   */
  getAllUsers = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const filter: any = {};
      if (req.query.role) filter.role = req.query.role;

      const users = await this.userService.getAllUsers({ page, limit }, filter);
      sendSuccess(res, "Fetched all users", { users });
    }
  );

  /**
   * Get user details by ID.
   */
  getUserById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.params.id;
      const user = await this.userService.getUserById(userId);
      sendSuccess(res, "Fetched user details", { user });
    }
  );

  /**
   * Update user status (activate/deactivate).
   */
  updateUserStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.params.id;
      const updateData = req.body;
      const updatedUser = await this.userService.updateUserStatus(userId, updateData);
      sendSuccess(res, "User updated successfully", { user: updatedUser });
    }
  );

  /**
   * Update the status of a partner (activate/deactivate).
   */
  updatePartnerStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const partnerId = req.params.id;
      const updateData = req.body;
      const updatedPartner = await this.partnerService.updatePartnerStatus(partnerId, updateData);
      sendSuccess(res, "Partner updated successfully", { partner: updatedPartner });
    }
  );

  /**
   * Get all partners with pagination.
   */
  getAllPartners = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const partners = await this.partnerService.getAllPartners({ page, limit });
      sendSuccess(res, "Fetched all partners", { partners });
    }
  );

  /**
   * Get all partner requests with pagination.
   */
  getAllPartnersRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const filter: any = {};

      const partners = await this.partnerService.getAllPartners({ page, limit }, filter);
      sendSuccess(res, "Fetched all partner requests", { partners });
    }
  );

  /**
   * Get detailed verification status of a partner.
   */
  getDetailedVerificationStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const partnerId = req.params.id;
      const status = await this.partnerService.getDetailedVerificationStatus(partnerId);
      sendSuccess(res, "Fetched detailed verification status", { status });
    }
  );

  /**
   * Update the verification status of a partner's document.
   */
  updatePartnerDocumentStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const partnerId = req.params.id;
      const { documentType, status, rejectionReason } = req.body;
      await this.partnerService.updateDocumentStatus(partnerId, documentType, status, rejectionReason);
      sendSuccess(res, "Partner document status updated successfully");
    }
  );

  /**
   * Get partner details by ID.
   */
  getPartnerDetails = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const partnerId = req.params.id;
      const partner = await this.partnerService.getCurrentPartner(partnerId);
      sendSuccess(res, "Fetched partner details", { partner });
    }
  );
}
