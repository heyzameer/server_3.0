import { BaseRepository } from './BaseRepository';
import { IDestination } from '../interfaces/IModel/IDestination';
import { Destination } from '../models/Destination';
import { injectable } from 'tsyringe';
import { IDestinationRepository } from '../interfaces/IRepository/IDestinationRepository';

@injectable()
export class DestinationRepository extends BaseRepository<IDestination> implements IDestinationRepository {
    constructor() {
        super(Destination);
    }

    async findBySlug(slug: string): Promise<IDestination | null> {
        return this.findOne({ slug, isActive: true });
    }

    async findTrending(): Promise<IDestination[]> {
        return this.find({ trending: true, isActive: true });
    }
}
