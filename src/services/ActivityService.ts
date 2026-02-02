import { injectable, inject } from 'tsyringe';
import { IActivityRepository } from '../repositories/ActivityRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IActivity } from '../interfaces/IModel/IActivity';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';

export interface IActivityService {
    createActivity(propertyId: string, data: any): Promise<IActivity>;
    getActivitiesByProperty(propertyId: string): Promise<IActivity[]>;
    getActivityById(id: string): Promise<IActivity>;
    updateActivity(id: string, data: any): Promise<IActivity>;
    deleteActivity(id: string): Promise<IActivity>;
}

@injectable()
export class ActivityService implements IActivityService {
    constructor(
        @inject('ActivityRepository') private activityRepository: IActivityRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository
    ) { }

    async createActivity(propertyId: string, data: any): Promise<IActivity> {
        const property = await this.propertyRepository.findByPropertyId(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        const activityData = {
            ...data,
            propertyId: property._id,
            activityType: 'property_based',
            isActive: true
        };
        return await this.activityRepository.create(activityData);
    }

    async getActivitiesByProperty(propertyId: string): Promise<IActivity[]> {
        const property = await this.propertyRepository.findByPropertyId(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }
        return await this.activityRepository.findByPropertyId(property._id as any);
    }

    async getActivityById(id: string): Promise<IActivity> {
        const activity = await this.activityRepository.findById(id);
        if (!activity) {
            throw new AppError('Activity not found', HttpStatus.NOT_FOUND);
        }
        return activity;
    }

    async updateActivity(id: string, data: any): Promise<IActivity> {
        const activity = await this.activityRepository.update(id, data);
        if (!activity) {
            throw new AppError('Activity not found', HttpStatus.NOT_FOUND);
        }
        return activity;
    }

    async deleteActivity(id: string): Promise<IActivity> {
        const activity = await this.activityRepository.update(id, { isActive: false } as any);
        if (!activity) {
            throw new AppError('Activity not found', HttpStatus.NOT_FOUND);
        }
        return activity;
    }
}
