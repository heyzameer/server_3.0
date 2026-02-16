import { injectable, inject } from 'tsyringe';
import { IActivityRepository } from '../interfaces/IRepository/IActivityRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IActivity } from '../interfaces/IModel/IActivity';
import { IActivityService } from '../interfaces/IService/IActivityService';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';
import { getSignedFileUrl } from '../middleware/upload';

@injectable()
export class ActivityService implements IActivityService {
    constructor(
        @inject('ActivityRepository') private activityRepository: IActivityRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository
    ) { }

    async createActivity(propertyId: string, data: any): Promise<IActivity> {
        let property;
        if (mongoose.isValidObjectId(propertyId)) {
            property = await this.propertyRepository.findById(propertyId);
        } else {
            property = await this.propertyRepository.findByPropertyId(propertyId);
        }

        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        const activityData = {
            ...data,
            propertyId: property._id,
            activityType: 'property_based',
            isActive: true
        };
        const activity = await this.activityRepository.create(activityData);
        return this.injectSignedUrls(activity);
    }

    async getActivitiesByProperty(propertyId: string): Promise<IActivity[]> {
        let property;
        if (mongoose.isValidObjectId(propertyId)) {
            property = await this.propertyRepository.findById(propertyId);
        } else {
            property = await this.propertyRepository.findByPropertyId(propertyId);
        }

        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }
        const activities = await this.activityRepository.findByPropertyId(property._id as any);
        return Promise.all(activities.map(activity => this.injectSignedUrls(activity)));
    }

    async getActivityById(id: string): Promise<IActivity> {
        const activity = await this.activityRepository.findById(id);
        if (!activity) {
            throw new AppError('Activity not found', HttpStatus.NOT_FOUND);
        }
        return this.injectSignedUrls(activity);
    }

    async updateActivity(id: string, data: any): Promise<IActivity> {
        const activity = await this.activityRepository.update(id, data);
        if (!activity) {
            throw new AppError('Activity not found', HttpStatus.NOT_FOUND);
        }
        return this.injectSignedUrls(activity);
    }

    async deleteActivity(id: string): Promise<IActivity> {
        const activity = await this.activityRepository.update(id, { isActive: false } as any);
        if (!activity) {
            throw new AppError('Activity not found', HttpStatus.NOT_FOUND);
        }
        return activity;
    }

    public async injectSignedUrls(activity: any): Promise<any> {
        const activityObj = activity.toObject ? activity.toObject() : activity;

        if (activityObj.images && activityObj.images.length > 0) {
            activityObj.images = await Promise.all(activityObj.images.map(async (img: any) => {
                if (typeof img === 'string') return await getSignedFileUrl(img);
                if (img && img.url) return await getSignedFileUrl(img.url);
                return img;
            }));
        }
        return activityObj;
    }
}
