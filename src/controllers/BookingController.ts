import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IBookingService } from '../services/BookingService';
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
            activityIds
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
        const userId = (req as any).user._id; // From auth middleware
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
        const userId = (req as any).user._id;

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
        const { status, approvalStatus } = req.query;

        const bookings = await this.bookingService.getPartnerBookings(partnerId, {
            status: status as string,
            approvalStatus: approvalStatus as string
        });

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
}
