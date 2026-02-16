import { IActivity } from '../IModel/IActivity';

export interface IActivityService {
    createActivity(propertyId: string, data: any): Promise<IActivity>;
    getActivitiesByProperty(propertyId: string): Promise<IActivity[]>;
    getActivityById(id: string): Promise<IActivity>;
    updateActivity(id: string, data: any): Promise<IActivity>;
    deleteActivity(id: string): Promise<IActivity>;
}
