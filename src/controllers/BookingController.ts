import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IBookingService } from '../interfaces/IService/IBookingService';
import { asyncHandler } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';

@injectable()
export class BookingController {
    constructor(
        @inject('BookingService') private bookingService: IBookingService
    ) { }

    /**
     * Calculate booking price
     * POST /api/v1/bookings/calculate-price
     */
    calculatePrice = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId, checkIn, checkOut, rooms, mealPlanId, activityIds } = req.body;

        if (!propertyId || !checkIn || !checkOut || !rooms || rooms.length === 0) {
            res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Missing required fields: propertyId, checkIn, checkOut, rooms'
            });
            return;
        }

        const priceBreakdown = await this.bookingService.calculateBookingPrice({
            propertyId,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            rooms,
            mealPlanId,
            activityIds,
            userId: req.user?.userId
        });

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Price calculated successfully',
            data: priceBreakdown
        });
    });

    /**
     * Create a new booking
     * POST /api/v1/bookings
     */
    createBooking = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.userId; // From auth middleware
        const { propertyId, partnerId, checkIn, checkOut, rooms, mealPlanId, activityIds, guestDetails } = req.body;

        if (!propertyId || !partnerId || !checkIn || !checkOut || !rooms || !guestDetails) {
            res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Missing required fields'
            });
            return;
        }

        const booking = await this.bookingService.createBooking(userId, partnerId, {
            propertyId,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            rooms,
            mealPlanId,
            activityIds,
            guestDetails
        });

        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });
    });

    /**
     * Get booking by ID
     * GET /api/v1/bookings/:bookingId
     */
    getBookingById = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;

        const booking = await this.bookingService.getBookingById(bookingId);

        res.status(HttpStatus.OK).json({
            success: true,
            data: booking
        });
    });

    /**
     * Get user bookings
     * GET /api/v1/users/me/bookings
     */
    getUserBookings = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.userId;

        const bookings = await this.bookingService.getUserBookings(userId);

        res.status(HttpStatus.OK).json({
            success: true,
            data: bookings
        });
    });

    /**
     * Get partner bookings
     * GET /api/v1/partner/bookings
     */
    getPartnerBookings = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = (req as any).partner.partnerId; // From partner auth middleware
        const { status, approvalStatus, startDate, endDate, search } = req.query;

        console.log('🔍 getPartnerBookings original query:', req.query);

        const filters: any = {};

        if (status) filters.status = status;
        if (approvalStatus) filters.partnerApprovalStatus = approvalStatus;

        if (startDate || endDate) {
            filters.bookedAt = {};
            if (startDate) filters.bookedAt.$gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                filters.bookedAt.$lte = end;
            }
        }

        if (search) {
            filters.$or = [
                { bookingId: { $regex: search, $options: 'i' } },
                { 'guestDetails.name': { $regex: search, $options: 'i' } }
            ];
        }

        console.log('🔍 getPartnerBookings processed filters:', JSON.stringify(filters, null, 2));

        const bookings = await this.bookingService.getPartnerBookings(partnerId, filters);

        console.log('  bookings found:', bookings.length);

        res.status(HttpStatus.OK).json({
            success: true,
            data: bookings
        });
    });

    /**
     * Get partner booking by ID
     * GET /api/v1/partner/bookings/:bookingId
     */
    getPartnerBookingDetails = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const booking = await this.bookingService.getBookingById(bookingId);

        res.status(HttpStatus.OK).json({
            success: true,
            data: booking
        });
    });

    /**
     * Approve booking
     * PATCH /api/v1/partner/bookings/:bookingId/approve
     */
    approveBooking = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const partnerId = (req as any).partner.partnerId;

        const booking = await this.bookingService.approveBooking(bookingId, partnerId);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Booking approved successfully',
            data: booking
        });
    });

    /**
     * Reject booking
     * PATCH /api/v1/partner/bookings/:bookingId/reject
     */
    rejectBooking = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const { reason } = req.body;
        const partnerId = (req as any).partner.partnerId;

        if (!reason) {
            res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Rejection reason is required'
            });
            return;
        }

        const booking = await this.bookingService.rejectBooking(bookingId, partnerId, reason);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Booking rejected successfully',
            data: booking
        });
    });

    /**
     * Complete booking
     * PATCH /api/v1/partner/bookings/:bookingId/complete
     */
    completeBooking = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const partnerId = (req as any).partner.partnerId;

        const booking = await this.bookingService.completeBooking(bookingId, partnerId);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Booking marked as completed',
            data: booking
        });
    });

    /**
     * Check in guest
     * PATCH /api/v1/partner/bookings/:bookingId/check-in
     */
    checkIn = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const partnerId = (req as any).partner.partnerId;

        const booking = await this.bookingService.checkInBooking(bookingId, partnerId);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Guest checked in successfully',
            data: booking
        });
    });

    /**
     * Check out guest
     * PATCH /api/v1/partner/bookings/:bookingId/check-out
     */
    checkOut = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const partnerId = (req as any).partner.partnerId;

        const booking = await this.bookingService.checkOutBooking(bookingId, partnerId);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Guest checked out successfully',
            data: booking
        });
    });

    /**
     * Cancel booking (user)
     * POST /api/v1/bookings/:bookingId/cancel
     */
    cancelBooking = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const { reason } = req.body;
        const userId = req.user!.userId;

        if (!reason) {
            res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Cancellation reason is required'
            });
            return;
        }

        const booking = await this.bookingService.cancelBooking(bookingId, userId, reason);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: booking
        });
    });

    /**
     * Request refund (user)
     * POST /api/v1/bookings/:bookingId/refund-request
     */
    requestRefund = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const { reason } = req.body;
        const userId = req.user!.userId;

        if (!reason) {
            res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Refund reason is required'
            });
            return;
        }

        const booking = await this.bookingService.requestRefund(bookingId, userId, reason);

        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Refund request submitted successfully',
            data: booking
        });
    });

    /**
     * Process refund (partner/admin)
     * PATCH /api/v1/partner/bookings/:bookingId/refund
     */
    processRefund = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId } = req.params;
        const { approved, note } = req.body;

        if (approved === undefined) {
            res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Approval status is required'
            });
            return;
        }

        const booking = await this.bookingService.processRefund(bookingId, approved, note);

        res.status(HttpStatus.OK).json({
            success: true,
            message: approved ? 'Refund approved successfully' : 'Refund rejected',
            data: booking
        });
    });
}
