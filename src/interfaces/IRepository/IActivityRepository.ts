import { IActivity } from '../IModel/IActivity';

export interface IActivityRepository {
    create(data: Partial<IActivity>): Promise<IActivity>;
    findById(id: string): Promise<IActivity | null>;
    findByPropertyId(propertyId: string): Promise<IActivity[]>;
    update(id: string, data: Partial<IActivity>): Promise<IActivity | null>;
    delete(id: string): Promise<IActivity | null>;
}
