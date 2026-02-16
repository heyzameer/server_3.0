import { injectable, inject } from 'tsyringe';
import { IDestinationRepository } from '../interfaces/IRepository/IDestinationRepository';
import { IDestination } from '../interfaces/IModel/IDestination';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import { getSignedFileUrl } from '../middleware/upload';
import { logger } from '../utils/logger';

export interface IDestinationService {
    createDestination(data: Partial<IDestination>): Promise<IDestination>;
    getAllDestinations(filter?: any): Promise<IDestination[]>;
    getDestinationBySlug(slug: string): Promise<IDestination>;
    getDestinationById(id: string): Promise<IDestination>;
    getTrendingDestinations(): Promise<IDestination[]>;
    searchDestinations(query: string, isAdmin?: boolean): Promise<IDestination[]>;
    updateDestination(id: string, data: Partial<IDestination>): Promise<IDestination>;
    deleteDestination(id: string): Promise<void>;
    addPlaceToVisit(destinationId: string, place: any): Promise<IDestination>;
    updatePlaceToVisit(destinationId: string, placeId: string, placeData: any): Promise<IDestination>;
    removePlaceToVisit(destinationId: string, placeId: string): Promise<IDestination>;
}

@injectable()
export class DestinationService implements IDestinationService {
    constructor(
        @inject('DestinationRepository') private destinationRepository: IDestinationRepository
    ) { }

    async createDestination(data: Partial<IDestination>): Promise<IDestination> {
        // Generate slug if not provided
        if (!data.slug && data.name) {
            data.slug = data.name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        if (!data.slug) {
            throw new AppError('Slug generation failed. Name is required.', HttpStatus.BAD_REQUEST);
        }

        // Generate slugs for places if they exist
        if (data.placesToVisit && Array.isArray(data.placesToVisit)) {
            data.placesToVisit = data.placesToVisit.map((place: any) => {
                if (!place.slug && place.name) {
                    place.slug = place.name.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                }
                return place;
            });
        }

        const existing = await this.destinationRepository.findBySlug(data.slug);
        if (existing) {
            throw new AppError('Destination already exists', HttpStatus.CONFLICT);
        }
        const created = await this.destinationRepository.create(data);
        return this.injectSignedUrls(created);
    }

    async getAllDestinations(filter: any = {}): Promise<IDestination[]> {
        const { includeInactive, ...query } = filter;
        const findQuery = includeInactive ? query : { ...query, isActive: true };
        const destinations = await this.destinationRepository.find(findQuery);
        return Promise.all(destinations.map(dest => this.injectSignedUrls(dest)));
    }

    async getDestinationBySlug(slug: string): Promise<IDestination> {
        const destination = await this.destinationRepository.findBySlug(slug);
        if (!destination) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }
        return this.injectSignedUrls(destination);
    }

    async getTrendingDestinations(): Promise<IDestination[]> {
        const destinations = await this.destinationRepository.findTrending();
        return Promise.all(destinations.map(dest => this.injectSignedUrls(dest)));
    }

    async updateDestination(id: string, data: Partial<IDestination>): Promise<IDestination> {
        const updated = await this.destinationRepository.update(id, data);
        if (!updated) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }
        return this.injectSignedUrls(updated);
    }

    async deleteDestination(id: string): Promise<void> {
        const deleted = await this.destinationRepository.delete(id);
        if (!deleted) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }
    }

    async getDestinationById(id: string): Promise<IDestination> {
        const destination = await this.destinationRepository.findById(id);
        if (!destination) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }
        return this.injectSignedUrls(destination);
    }

    async searchDestinations(query: string, isAdmin: boolean = false): Promise<IDestination[]> {
        const findQuery: any = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        };

        if (!isAdmin) {
            findQuery.isActive = true;
        }

        const destinations = await this.destinationRepository.find(findQuery);
        return Promise.all(destinations.map(dest => this.injectSignedUrls(dest)));
    }

    async addPlaceToVisit(destinationId: string, place: any): Promise<IDestination> {
        const destination = await this.destinationRepository.findById(destinationId);
        if (!destination) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }

        // Generate slug from place name
        const slug = place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        try {
            destination.placesToVisit.push({
                ...place,
                slug,
                images: place.images || []
            });

            await destination.save();
        } catch (error) {
            console.error('Error adding place to destination:', error);
            throw error;
        }
        return this.injectSignedUrls(destination);
    }

    async updatePlaceToVisit(destinationId: string, placeId: string, placeData: any): Promise<IDestination> {
        const destination = await this.destinationRepository.findById(destinationId);
        if (!destination) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }

        const placeIndex = destination.placesToVisit.findIndex((p: any) => p._id.toString() === placeId);
        if (placeIndex === -1) {
            throw new AppError('Place not found', HttpStatus.NOT_FOUND);
        }

        // Update slug if name changed
        if (placeData.name && placeData.name !== destination.placesToVisit[placeIndex].name) {
            placeData.slug = placeData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }

        destination.placesToVisit[placeIndex] = {
            ...destination.placesToVisit[placeIndex],
            ...placeData
        };

        await destination.save();
        return destination;
    }

    async removePlaceToVisit(destinationId: string, placeId: string): Promise<IDestination> {
        const destination = await this.destinationRepository.findById(destinationId);
        if (!destination) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }

        destination.placesToVisit = destination.placesToVisit.filter((p: any) => p._id.toString() !== placeId);
        await destination.save();
        return this.injectSignedUrls(destination);
    }

    private async injectSignedUrls(destination: any): Promise<IDestination> {
        const dest = destination.toObject ? destination.toObject() : destination;

        try {
            if (dest.coverImage) {
                dest.coverImage = await getSignedFileUrl(dest.coverImage);
            }

            if (dest.images && dest.images.length > 0) {
                dest.images = await Promise.all(dest.images.map((img: string) => getSignedFileUrl(img)));
            }

            if (dest.placesToVisit && dest.placesToVisit.length > 0) {
                dest.placesToVisit = await Promise.all(dest.placesToVisit.map(async (place: any) => {
                    if (place.images && place.images.length > 0) {
                        place.images = await Promise.all(place.images.map((img: string) => getSignedFileUrl(img)));
                    }
                    return place;
                }));
            }
        } catch (error) {
            logger.error(`Error injecting signed URLs for destination ${dest._id}:`, error);
        }

        return dest as IDestination;
    }
}
