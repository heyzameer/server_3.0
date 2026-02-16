import { IUserService } from "../interfaces/IService/IUserService";
import { IAuthService } from "../interfaces/IService/IAuthService";
import { IPropertyService } from "../interfaces/IService/IPropertyService";
import { IBookingService } from '../interfaces/IService/IBookingService';
import { asyncHandler } from "../utils/errorHandler";
import { sendSuccess } from "../utils/response";
import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import { IPartnerService } from "../interfaces/IService/IPartnerService";
import config from "../config";
import { ResponseMessages } from "../enums/ResponseMessages";
import { Booking } from "../models/Booking";
import { Property } from "../models/Property";
import { Partner } from "../models/Partner";

/**
 * Controller for admin-related operations.
 * Handles user management, partner verification, and system administration.
 */
@injectable()
export class AdminController {
  constructor(
    @inject("AuthService") private authService: IAuthService,
    @inject("UserService") private userService: IUserService,
    @inject("PartnerService") private partnerService: IPartnerService,
    @inject("PropertyService") private propertyService: IPropertyService,
    @inject("BookingService") private bookingService: IBookingService
  ) {
    console.log("AdminController initialized");
  }

  /**
   * Handle admin login and issue tokens.
   */
  adminLogin = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } =
        await this.authService.adminLogin(email, password);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
        maxAge: config.cookieExpiration ? parseInt(config.cookieExpiration.toString()) * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // Default to 7 days
      });

      sendSuccess(res, ResponseMessages.LOGIN_SUCCESS, {
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
    async (req: Request, res: Response, _next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const filter: any = {};
      if (req.query.role) filter.role = req.query.role;

      const users = await this.userService.getAllUsers({ page, limit }, filter);
      sendSuccess(res, ResponseMessages.USERS_RETRIEVED, { users });
    }
  );

  /**
   * Get user details by ID.
   */
  getUserById = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.params.id;
      const user = await this.userService.getUserWithBookings(userId);
      sendSuccess(res, ResponseMessages.USER_RETRIEVED, { user });
    }
  );

  /**
   * Update user status (activate/deactivate).
   */
  updateUserStatus = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.params.id;
      const updateData = req.body;
      const updatedUser = await this.userService.updateUserStatus(userId, updateData);
      sendSuccess(res, ResponseMessages.USER_RETRIEVED, { user: updatedUser });
    }
  );

  /**
   * Update the status of a partner (activate/deactivate).
   */
  updatePartnerStatus = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const partnerId = req.params.id;
      const updateData = req.body;
      const updatedPartner = await this.partnerService.updatePartnerStatus(partnerId, updateData);
      sendSuccess(res, ResponseMessages.PARTNER_UPDATED, { partner: updatedPartner });
    }
  );

  /**
   * Get all partners with pagination.
   */
  getAllPartners = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const aadharStatus = req.query.aadharStatus as string;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const filter: any = {};
      if (aadharStatus) filter.aadharStatus = aadharStatus;
      if (search) filter.search = search;
      if (status) filter.status = status;

      const partners = await this.partnerService.getAllPartners({ page, limit }, filter);
      sendSuccess(res, ResponseMessages.PARTNERS_RETRIEVED, { partners });
    }
  );

  /**
   * Get all partner requests with pagination.
   */
  getAllPartnersRequest = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const filter: any = {
        aadharStatus: 'manual_review'
      };

      const partners = await this.partnerService.getAllPartners({ page, limit }, filter);
      sendSuccess(res, ResponseMessages.PARTNERS_RETRIEVED, { partners });
    }
  );

  /**
   * Get detailed verification status of a partner.
   */
  getDetailedVerificationStatus = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const partnerId = req.params.id;
      const status = await this.partnerService.getDetailedVerificationStatus(partnerId);
      sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { status });
    }
  );

  /**
   * Update the verification status of a partner's document.
   */
  updatePartnerDocumentStatus = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const partnerId = req.params.id;
      const { documentType, status, rejectionReason } = req.body;
      await this.partnerService.updateDocumentStatus(partnerId, documentType, status, rejectionReason);

      let updatedPartner = await this.partnerService.getCurrentPartner(partnerId);
      updatedPartner = await this.partnerService.injectSignedUrls(updatedPartner);
      updatedPartner = this.partnerService.injectDecryptedDetails(updatedPartner);

      sendSuccess(res, ResponseMessages.PARTNER_UPDATED, { partner: updatedPartner });
    }
  );

  /**
   * Get partner details by ID.
   */
  getPartnerDetails = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const partnerId = req.params.id;
      let partner = await this.partnerService.getCurrentPartner(partnerId);
      partner = await this.partnerService.injectSignedUrls(partner);
      partner = this.partnerService.injectDecryptedDetails(partner);
      sendSuccess(res, ResponseMessages.USER_RETRIEVED, { partner });
    }
  );



  /**   * Send an email to a partner.
   */
  sendPartnerEmail = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { email, subject, message } = req.body;
      await this.partnerService.sendEmailToPartner(email, subject, message);
      sendSuccess(res, ResponseMessages.EMAIL_SENT_SUCCESS);
    }
  );


  /**
   * Get all properties with pagination and optional filtering.
   * Filters: status, verificationStatus, propertyType, city, isActive, isVerified, search
   */
  getAllProperties = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const status = req.query.status as string;
      const verificationStatus = req.query.verificationStatus as string;
      const propertyType = req.query.propertyType as string;
      const city = req.query.city as string;
      const search = req.query.search as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const isVerified = req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined;

      const filter: any = {};
      if (status) filter.status = status;
      if (verificationStatus) filter.verificationStatus = verificationStatus;
      if (propertyType) filter.propertyType = propertyType;
      if (city) filter.city = city;
      if (search) filter.search = search;
      if (isActive !== undefined) filter.isActive = isActive;
      if (isVerified !== undefined) filter.isVerified = isVerified;

      const properties = await this.propertyService.getAllProperties(
        { page, limit },
        filter
      );

      sendSuccess(res, ResponseMessages.PROPERTIES_RETRIEVED, {
        properties: properties.data,
        pagination: properties.pagination
      });
    }
  );

  /**
   * Get all property applications (pending verification).
   */
  getAllPropertyApplications = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const properties = await this.propertyService.getPendingProperties({ page, limit });

      sendSuccess(res, ResponseMessages.PROPERTIES_RETRIEVED, {
        properties: properties.data,
        pagination: properties.pagination
      });
    }
  );

  /**
   * Get property verification details.
   */
  getPropertyVerificationDetails = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const propertyId = req.params.id;
      const details = await this.propertyService.getPropertyVerificationDetails(propertyId);
      sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { details });
    }
  );

  /**
   * Update property document status (ownership, tax, banking).
   */
  updatePropertyDocumentStatus = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const propertyId = req.params.id;
      const { section, status, rejectionReason } = req.body;
      const property = await this.propertyService.updatePropertyDocumentStatus(
        propertyId,
        section,
        status,
        rejectionReason
      );
      sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    }
  );

  /**
   * Verify property (approve/reject).
   */
  verifyProperty = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const propertyId = req.params.id;
      const { status, rejectionReason } = req.body;
      const property = await this.propertyService.verifyProperty(
        propertyId,
        status,
        rejectionReason
      );
      sendSuccess(res, status === 'verified' || status === 'approved' ? ResponseMessages.PROPERTY_VERIFIED : ResponseMessages.PROPERTY_REJECTED, { property });
    }
  );

  /**
   * Get property by ID (for admin).
   */
  getPropertyById = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const propertyId = req.params.id;
      // Use getPropertyById from service which injects signed URLs
      // We also need to ensure partner details are included.
      // PropertyService.getPropertyVerificationDetails includes both.
      // Let's use that but map it to what the frontend expects (property object with partner populated).

      const details = await this.propertyService.getPropertyVerificationDetails(propertyId);

      // details contains { property: IProperty, partner: IPartner, ... }
      // We want to return the property with the partner object nested if typically expected,
      // OR we update the frontend to use the 'details' structure.

      // Current frontend slice expects response.data.property
      // PropertyVerificationDetail.tsx expects selectedProperty to be IProperty.
      // And it accesses property.partner?.fullName.

      // So we need to construct a property object that includes the partner.
      // details.property is the mongoose document (or object).
      // details.partner is the partner document.

      const property: any = { ...details.property };
      if (details.property.toObject) {
        // handle if it is a mongoose doc, though injectSignedUrls usually returns object
        // but let's be safe
      }

      if (details.partner) {
        property.partner = details.partner;
      }

      sendSuccess(res, ResponseMessages.PROPERTY_RETRIEVED, { property });
    }
  );

  /**
   * Update property (for admin).
   */
  updateProperty = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const propertyId = req.params.id;
      const updateData = req.body;
      console.log(`[AdminController] updateProperty hit for id: ${propertyId} `, updateData);

      // Perform the update
      await this.propertyService.adminUpdateProperty(propertyId, updateData);

      // Fetch the full property with partner details and signed URLs to maintain consistency
      const details = await this.propertyService.getPropertyVerificationDetails(propertyId);

      const property: any = { ...details.property };
      if (details.partner) {
        property.partner = details.partner;
      }

      sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    }
  );

  /**
   * Get all bookings with filtering.
   */
  getAllBookings = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { status, bookingType } = req.query;
      const filter: any = {};
      if (status) filter.status = status;
      if (bookingType) filter.bookingType = bookingType;

      const bookings = await this.bookingService.getAllBookings(filter);
      sendSuccess(res, ResponseMessages.BOOKINGS_RETRIEVED || 'Bookings retrieved successfully', { bookings });
    }
  );

  /**
   * Get booking by ID.
   */
  getBookingById = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const booking = await this.bookingService.getBookingById(id);
      sendSuccess(res, ResponseMessages.BOOKING_RETRIEVED || 'Booking retrieved successfully', { booking });
    }
  );

  /**
   * Update booking.
   */
  updateBooking = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      const updateData = req.body;
      const booking = await this.bookingService.updateBooking(id, updateData);
      sendSuccess(res, ResponseMessages.BOOKING_UPDATED || 'Booking updated successfully', { booking });
    }
  );

  /**
   * Delete booking.
   */
  deleteBooking = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { id } = req.params;
      await this.bookingService.deleteBooking(id);
      sendSuccess(res, ResponseMessages.BOOKING_DELETED || 'Booking deleted successfully');
    }
  );

  /**
   * Get dashboard statistics for the admin panel.
   */
  getDashboardStats = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      // 1. Get Basic Counts
      const totalBookings = await Booking.countDocuments();
      const totalProperties = await Property.countDocuments();
      const totalPartners = await Partner.countDocuments();

      // 2. Active Guests (Unique users with non-cancelled bookings)
      const activeGuestsResult = await Booking.distinct('userId', {
        status: { $in: ['confirmed', 'checked_in', 'checked_out', 'completed'] }
      });
      const activeGuests = activeGuestsResult.length;

      // 3. Recent Bookings (Top 5)
      const recentBookings = await Booking.find()
        .populate('userId', 'fullName')
        .populate('propertyId', 'propertyName')
        .sort({ createdAt: -1 })
        .limit(5);

      // 4. Pending Approvals
      const pendingProperties = await Property.find({
        verificationStatus: 'pending',
        onboardingCompleted: true
      })
        .populate('partnerId', 'fullName')
        .limit(3);

      const pendingPartners = await Partner.find({
        'personalDocuments.aadharStatus': 'manual_review'
      }).limit(3);

      const pendingBookings = await Booking.find({
        status: { $in: ['payment_completed', 'confirmed'] },
        partnerApprovalStatus: 'pending'
      })
        .populate('propertyId', 'propertyName')
        .populate('userId', 'fullName')
        .limit(3);

      const pendingRefunds = await Booking.find({
        refundStatus: 'requested'
      })
        .populate('userId', 'fullName')
        .limit(3);

      // 5. Calculate Trends (Simple implementation: current month vs last month)
      const now = new Date();
      const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [currentMonthBookings, lastMonthBookings] = await Promise.all([
        Booking.countDocuments({ createdAt: { $gte: firstDayCurrentMonth } }),
        Booking.countDocuments({ createdAt: { $gte: firstDayLastMonth, $lt: firstDayCurrentMonth } })
      ]);

      const bookingTrend = lastMonthBookings === 0 ? '+100%' :
        `${(currentMonthBookings / lastMonthBookings * 100).toFixed(0)}% from last month`;

      // 6. Growth Chart Data
      const monthCount = parseInt(req.query.months as string) || 6;
      const growthData = [];
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const count = await Booking.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        });

        growthData.push({
          name: d.toLocaleString('default', { month: 'short' }),
          bookings: count,
          revenue: count * 5000 // Mock revenue for visualization if needed
        });
      }

      sendSuccess(res, 'Dashboard stats retrieved successfully', {
        stats: [
          {
            title: 'Total Bookings',
            count: totalBookings,
            trend: bookingTrend,
          },
          {
            title: 'Active Guests',
            count: activeGuests,
            trend: '+5% from last month', // Static for now or implement similar to bookings
          },
          {
            title: 'Properties Listed',
            count: totalProperties,
            trend: `+ ${await Property.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })} new this week`,
          },
          {
            title: 'Property Owners',
            count: totalPartners,
            trend: `+ ${await Partner.countDocuments({ 'personalDocuments.aadharStatus': 'manual_review' })} pending approval`,
          },
        ],
        growthData, // New field for chart
        recentBookings: recentBookings.map((b: any) => ({
          id: b._id,
          title: b.propertyId?.propertyName || 'Property Deleted',
          subtitle: `Booked by ${b.userId?.fullName || 'Guest'} `,
          status: b.status.charAt(0).toUpperCase() + b.status.slice(1).replace('_', ' '),
          statusColor: b.status === 'confirmed' || b.status === 'completed' ? 'bg-green-100 text-green-700' :
            b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        })),
        pendingApprovals: [
          ...pendingProperties.map((p: any) => ({
            id: p._id,
            title: p.propertyName,
            subtitle: `Listed by ${p.partnerId?.fullName || 'Unknown'} `,
            status: 'Property Pending',
            statusColor: 'bg-orange-100 text-orange-700'
          })),
          ...pendingPartners.map((p: any) => ({
            id: p._id,
            title: p.fullName,
            subtitle: 'Verification Pending',
            status: 'Owner Pending',
            statusColor: 'bg-yellow-100 text-yellow-700'
          })),
          ...pendingBookings.map((b: any) => ({
            id: b._id,
            title: b.propertyId?.propertyName || 'Booking',
            subtitle: `By ${b.userId?.fullName || 'Guest'} `,
            status: 'Booking Pending',
            statusColor: 'bg-blue-100 text-blue-700'
          })),
          ...pendingRefunds.map((b: any) => ({
            id: b._id,
            title: `Refund: ${b.bookingId || 'Request'} `,
            subtitle: `For ${b.userId?.fullName || 'Guest'} `,
            status: 'Refund Requested',
            statusColor: 'bg-red-100 text-red-700'
          }))
        ].slice(0, 5)
      });
    }
  );
}
