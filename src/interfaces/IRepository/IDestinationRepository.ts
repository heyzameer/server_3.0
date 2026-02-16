import { IDestination } from '../IModel/IDestination';

export interface IDestinationRepository {
    create(data: Partial<IDestination>): Promise<IDestination>;
    findById(id: string): Promise<IDestination | null>;
    find(filter?: any): Promise<IDestination[]>;
    update(id: string, data: Partial<IDestination>): Promise<IDestination | null>;
    delete(id: string): Promise<IDestination | null>;
    findBySlug(slug: string): Promise<IDestination | null>;
    findTrending(): Promise<IDestination[]>;
}
