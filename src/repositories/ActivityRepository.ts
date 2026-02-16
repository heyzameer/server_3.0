import { BaseRepository } from './BaseRepository';
import { IActivity } from '../interfaces/IModel/IActivity';
import { Activity } from '../models/Activity';
import { IActivityRepository } from '../interfaces/IRepository/IActivityRepository';

export class ActivityRepository extends BaseRepository<IActivity> implements IActivityRepository {
    constructor() {
        super(Activity);
    }

    async findByPropertyId(propertyId: string): Promise<IActivity[]> {
        return this.model.find({ propertyId, isActive: true });
    }
}
