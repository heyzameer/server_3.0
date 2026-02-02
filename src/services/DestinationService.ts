import { injectable, inject } from 'tsyringe';
import { IDestinationRepository } from '../interfaces/IRepository/IDestinationRepository';
import { IDestination } from '../interfaces/IModel/IDestination';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';

export interface IDestinationService {
    createDestination(data: Partial<IDestination>): Promise<IDestination>;
    getAllDestinations(filter?: any): Promise<IDestination[]>;
    getDestinationBySlug(slug: string): Promise<IDestination>;
    getTrendingDestinations(): Promise<IDestination[]>;
}

@injectable()
export class DestinationService implements IDestinationService {
    constructor(
        @inject('DestinationRepository') private destinationRepository: IDestinationRepository
    ) { }

    async createDestination(data: Partial<IDestination>): Promise<IDestination> {
        const existing = await this.destinationRepository.findBySlug(data.slug || '');
        if (existing) {
            throw new AppError('Destination already exists', HttpStatus.CONFLICT);
        }
        return this.destinationRepository.create(data);
    }

    async getAllDestinations(filter: any = {}): Promise<IDestination[]> {
        return this.destinationRepository.find({ ...filter, isActive: true });
    }

    async getDestinationBySlug(slug: string): Promise<IDestination> {
        const destination = await this.destinationRepository.findBySlug(slug);
        if (!destination) {
            throw new AppError('Destination not found', HttpStatus.NOT_FOUND);
        }
        return destination;
    }

    async getTrendingDestinations(): Promise<IDestination[]> {
        return this.destinationRepository.findTrending();
    }
}
