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
     * Get all destinations (Admin) - includes inactive
     * GET /api/v1/destinations/admin/all
     */
    static getAdminDestinations = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const destinations = await destinationService.getAllDestinations({ includeInactive: true });
        sendSuccess(res, 'Admin destinations fetched successfully', destinations, HttpStatus.OK);
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

    /**
     * Get destination by ID
     * GET /api/v1/destinations/id/:id
     */
    static getDestinationById = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { id } = req.params;
        const destination = await destinationService.getDestinationById(id);
        sendSuccess(res, 'Destination fetched successfully', destination, HttpStatus.OK);
    });

    /**
     * Search destinations
     * GET /api/v1/destinations/search?q=query
     */
    static searchDestinations = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { q } = req.query;
        // Check if admin is searching (can see inactive)
        const isAdmin = req.baseUrl?.includes('admin') || req.path?.includes('admin');
        const destinations = await destinationService.searchDestinations(q as string || '', isAdmin);
        sendSuccess(res, 'Search results fetched successfully', destinations, HttpStatus.OK);
    });

    /**
     * Create new destination
     * POST /api/v1/destinations
     */
    static createDestination = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const destination = await destinationService.createDestination(req.body);
        sendSuccess(res, 'Destination created successfully', destination, HttpStatus.CREATED);
    });

    /**
     * Update destination
     * PATCH /api/v1/destinations/:id
     */
    static updateDestination = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { id } = req.params;
        const destination = await destinationService.updateDestination(id, req.body);
        sendSuccess(res, 'Destination updated successfully', destination, HttpStatus.OK);
    });

    /**
     * Delete destination
     * DELETE /api/v1/destinations/:id
     */
    static deleteDestination = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { id } = req.params;
        await destinationService.deleteDestination(id);
        sendSuccess(res, 'Destination deleted successfully', undefined, HttpStatus.OK);
    });

    /**
     * Add place to visit
     * POST /api/v1/destinations/:id/places
     */
    static addPlaceToVisit = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { id } = req.params;
        const destination = await destinationService.addPlaceToVisit(id, req.body);
        sendSuccess(res, 'Place added successfully', destination, HttpStatus.OK);
    });

    /**
     * Update place to visit
     * PATCH /api/v1/destinations/:id/places/:placeId
     */
    static updatePlaceToVisit = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { id, placeId } = req.params;
        const destination = await destinationService.updatePlaceToVisit(id, placeId, req.body);
        sendSuccess(res, 'Place updated successfully', destination, HttpStatus.OK);
    });

    /**
     * Remove place to visit
     * DELETE /api/v1/destinations/:id/places/:placeId
     */
    static removePlaceToVisit = asyncHandler(async (req: Request, res: Response) => {
        const destinationService = container.resolve(DestinationService);
        const { id, placeId } = req.params;
        const destination = await destinationService.removePlaceToVisit(id, placeId);
        sendSuccess(res, 'Place removed successfully', destination, HttpStatus.OK);
    });
}
