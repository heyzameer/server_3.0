import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { DestinationService } from '../services/DestinationService';
import { asyncHandler } from '../utils/errorHandler';
import { sendSuccess } from '../utils/response';
import { HttpStatus } from '../enums/HttpStatus';

export class DestinationController {
    /**
     * Get all active destinations
     * GET /api/v1/destinations
     */
    static getAllDestinations = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const destinations = await destinationService.getAllDestinations();
        sendSuccess(res, 'Destinations fetched successfully', destinations, HttpStatus.OK);
    });

    /**
     * Get trending destinations
     * GET /api/v1/destinations/trending
     */
    static getTrendingDestinations = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const destinations = await destinationService.getTrendingDestinations();
        sendSuccess(res, 'Trending destinations fetched successfully', destinations, HttpStatus.OK);
    });

    /**
     * Get destination by slug
     * GET /api/v1/destinations/:slug
     */
    static getDestinationBySlug = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { slug } = req.params;
        const destination = await destinationService.getDestinationBySlug(slug);
        sendSuccess(res, 'Destination fetched successfully', destination, HttpStatus.OK);
    });
}
