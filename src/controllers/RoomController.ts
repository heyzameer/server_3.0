import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { RoomService } from '../services/RoomService';
import { AvailabilityService } from '../services/AvailabilityService';
import { RoomAvailabilityRepository } from '../repositories/RoomAvailabilityRepository';
import { sendSuccess } from '../utils/response';
import { HttpStatus } from '../enums/HttpStatus';
import { asyncHandler } from '../utils/errorHandler';

export class RoomController {
    static createRoom = asyncHandler(async (req: Request, res: Response) => {
        const roomService = container.resolve(RoomService);
        const { propertyId } = req.params;
        const room = await roomService.createRoom(propertyId, req.body);
        sendSuccess(res, 'Room created successfully', room, HttpStatus.CREATED);
    });

    static getRooms = asyncHandler(async (req: Request, res: Response) => {
        const roomService = container.resolve(RoomService);
        const { propertyId } = req.params;
        const rooms = await roomService.getRoomsByProperty(propertyId);
        sendSuccess(res, 'Rooms fetched successfully', rooms, HttpStatus.OK);
    });

    static getRoomById = asyncHandler(async (req: Request, res: Response) => {
        const roomService = container.resolve(RoomService);
        const { roomId } = req.params;
        const room = await roomService.getRoomById(roomId);
        sendSuccess(res, 'Room fetched successfully', room, HttpStatus.OK);
    });

    static updateRoom = asyncHandler(async (req: Request, res: Response) => {
        const roomService = container.resolve(RoomService);
        const { roomId } = req.params;
        const room = await roomService.updateRoom(roomId, req.body);
        sendSuccess(res, 'Room updated successfully', room, HttpStatus.OK);
    });

    static deleteRoom = asyncHandler(async (req: Request, res: Response) => {
        const roomService = container.resolve(RoomService);
        const { roomId } = req.params;
        await roomService.deleteRoom(roomId);
        sendSuccess(res, 'Room deleted successfully', undefined, HttpStatus.OK);
    });

    static uploadRoomImages = asyncHandler(async (req: Request, res: Response) => {
        const roomService = container.resolve(RoomService);
        const { roomId } = req.params;

        let metadata = [];
        if (req.body.imageMetadata) {
            try {
                metadata = JSON.parse(req.body.imageMetadata);
            } catch (e) {
                console.error("Failed to parse image metadata", e);
            }
        }

        const room = await roomService.uploadRoomImages(roomId, req.files as Express.Multer.File[], metadata);
        sendSuccess(res, 'Room images uploaded successfully', room, HttpStatus.OK);
    });

    // ============ AVAILABILITY MANAGEMENT ENDPOINTS ============

    /**
     * Get availability calendar for a room for a specific month
     * GET /api/v1/rooms/:roomId/availability?month=1&year=2026
     */
    static getAvailabilityCalendar = asyncHandler(async (req: Request, res: Response) => {
        const availabilityService = container.resolve(AvailabilityService);
        const { roomId } = req.params;
        const { month, year, startDate, endDate } = req.query;

        let calendar;

        if (startDate && endDate) {
            calendar = await availabilityService.getAvailabilityCalendar(
                roomId,
                undefined,
                undefined,
                new Date(startDate as string),
                new Date(endDate as string)
            );
        } else {
            calendar = await availabilityService.getAvailabilityCalendar(
                roomId,
                parseInt(month as string),
                parseInt(year as string)
            );
        }

        sendSuccess(res, 'Availability calendar fetched successfully', calendar, HttpStatus.OK);
    });

    /**
     * Manually block dates for a room
     * POST /api/v1/rooms/:roomId/block-dates
     * Body: { dates: string[], reason: 'maintenance' | 'manual', propertyId: string }
     */
    static blockDates = asyncHandler(async (req: Request, res: Response) => {
        const availabilityService = container.resolve(AvailabilityService);
        const { roomId } = req.params;
        const { dates, reason, propertyId } = req.body;

        const parsedDates = dates.map((d: string) => new Date(d));

        await availabilityService.manualBlockDates(roomId, propertyId, parsedDates, reason);

        sendSuccess(res, 'Dates blocked successfully', undefined, HttpStatus.OK);
    });

    /**
     * Unblock manually blocked dates
     * DELETE /api/v1/rooms/:roomId/unblock-dates
     * Body: { dates: string[] }
     */
    static unblockDates = asyncHandler(async (req: Request, res: Response) => {
        const availabilityRepo = container.resolve(RoomAvailabilityRepository);
        const { roomId } = req.params;
        const { dates } = req.body;

        const parsedDates = dates.map((d: string) => new Date(d));

        await availabilityRepo.unblockDates(roomId, parsedDates);

        sendSuccess(res, 'Dates unblocked successfully', undefined, HttpStatus.OK);
    });

    /**
     * Set custom pricing for specific dates
     * PUT /api/v1/rooms/:roomId/custom-pricing
     * Body: { date: string, propertyId: string, pricing: { basePricePerNight: number, extraPersonCharge: number } }
     */
    static setCustomPricing = asyncHandler(async (req: Request, res: Response) => {
        const availabilityService = container.resolve(AvailabilityService);
        const { roomId } = req.params;
        const { date, propertyId, pricing } = req.body;

        await availabilityService.setCustomPricing(
            roomId,
            propertyId,
            new Date(date),
            pricing
        );

        sendSuccess(res, 'Custom pricing set successfully', undefined, HttpStatus.OK);
    });
}
