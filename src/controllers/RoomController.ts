import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IRoomService } from '../interfaces/IService/IRoomService';
import { IAvailabilityService } from '../interfaces/IService/IAvailabilityService';
import { IRoomAvailabilityRepository } from '../interfaces/IRepository/IRoomAvailabilityRepository';
import { sendSuccess } from '../utils/response';
import { HttpStatus } from '../enums/HttpStatus';
import { asyncHandler } from '../utils/errorHandler';

@injectable()
export class RoomController {
    constructor(
        @inject('RoomService') private roomService: IRoomService,
        @inject('AvailabilityService') private availabilityService: IAvailabilityService,
        @inject('RoomAvailabilityRepository') private availabilityRepo: IRoomAvailabilityRepository
    ) { }

    createRoom = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const room = await this.roomService.createRoom(propertyId, req.body);
        sendSuccess(res, 'Room created successfully', room, HttpStatus.CREATED);
    });

    getRooms = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const rooms = await this.roomService.getRoomsByProperty(propertyId);
        sendSuccess(res, 'Rooms fetched successfully', rooms, HttpStatus.OK);
    });

    getRoomById = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        const room = await this.roomService.getRoomById(roomId);
        sendSuccess(res, 'Room fetched successfully', room, HttpStatus.OK);
    });

    updateRoom = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        const room = await this.roomService.updateRoom(roomId, req.body);
        sendSuccess(res, 'Room updated successfully', room, HttpStatus.OK);
    });

    deleteRoom = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        await this.roomService.deleteRoom(roomId);
        sendSuccess(res, 'Room deleted successfully', undefined, HttpStatus.OK);
    });

    uploadRoomImages = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;

        let metadata = [];
        if (req.body.imageMetadata) {
            try {
                metadata = JSON.parse(req.body.imageMetadata);
            } catch (e) {
                console.error("Failed to parse image metadata", e);
            }
        }

        const room = await this.roomService.uploadRoomImages(roomId, req.files as Express.Multer.File[], metadata);
        sendSuccess(res, 'Room images uploaded successfully', room, HttpStatus.OK);
    });

    // ============ AVAILABILITY MANAGEMENT ENDPOINTS ============

    getAvailabilityCalendar = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        const { month, year, startDate, endDate } = req.query;

        let calendar;

        if (startDate && endDate) {
            calendar = await this.availabilityService.getAvailabilityCalendar(
                roomId,
                undefined,
                undefined,
                new Date(startDate as string),
                new Date(endDate as string)
            );
        } else {
            calendar = await this.availabilityService.getAvailabilityCalendar(
                roomId,
                parseInt(month as string),
                parseInt(year as string)
            );
        }

        sendSuccess(res, 'Availability calendar fetched successfully', calendar, HttpStatus.OK);
    });

    blockDates = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        const { dates, reason, propertyId } = req.body;

        const parsedDates = dates.map((d: string) => new Date(d));

        await this.availabilityService.manualBlockDates(roomId, propertyId, parsedDates, reason);

        sendSuccess(res, 'Dates blocked successfully', undefined, HttpStatus.OK);
    });

    unblockDates = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        const { dates } = req.body;

        const parsedDates = dates.map((d: string) => new Date(d));

        await this.availabilityRepo.unblockDates(roomId, parsedDates);

        sendSuccess(res, 'Dates unblocked successfully', undefined, HttpStatus.OK);
    });

    setCustomPricing = asyncHandler(async (req: Request, res: Response) => {
        const { roomId } = req.params;
        const { date, propertyId, pricing } = req.body;

        await this.availabilityService.setCustomPricing(
            roomId,
            propertyId,
            new Date(date),
            pricing
        );

        sendSuccess(res, 'Custom pricing set successfully', undefined, HttpStatus.OK);
    });
}
