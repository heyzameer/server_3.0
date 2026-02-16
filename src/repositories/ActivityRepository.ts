import { BaseRepository } from './BaseRepository';
import { IActivity } from '../interfaces/IModel/IActivity';
import { Activity } from '../models/Activity';

export interface IActivityRepository {
    create(data: Partial<IActivity>): Promise<IActivity>;
    findById(id: string): Promise<IActivity | null>;
    findByPropertyId(propertyId: string): Promise<IActivity[]>;
    update(id: string, data: Partial<IActivity>): Promise<IActivity | null>;
    delete(id: string): Promise<IActivity | null>;
}

export class ActivityRepository extends BaseRepository<IActivity> implements IActivityRepository {
    constructor() {
        super(Activity);
    }

    async findByPropertyId(propertyId: string): Promise<IActivity[]> {
        return this.model.find({ propertyId, isActive: true });
    }
}
