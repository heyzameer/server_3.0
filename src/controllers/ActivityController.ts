import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IActivityService } from '../interfaces/IService/IActivityService';
import { HttpStatus } from '../enums/HttpStatus';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/errorHandler';

@injectable()
export class ActivityController {
    constructor(
        @inject('ActivityService') private activityService: IActivityService
    ) { }

    createActivity = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const activity = await this.activityService.createActivity(propertyId, req.body);
        sendSuccess(res, 'Activity created successfully', activity, HttpStatus.CREATED);
    });

    getActivities = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const activities = await this.activityService.getActivitiesByProperty(propertyId);
        sendSuccess(res, 'Activities fetched successfully', activities, HttpStatus.OK);
    });

    getActivityById = asyncHandler(async (req: Request, res: Response) => {
        const { activityId } = req.params;
        const activity = await this.activityService.getActivityById(activityId);
        sendSuccess(res, 'Activity fetched successfully', activity, HttpStatus.OK);
    });

    updateActivity = asyncHandler(async (req: Request, res: Response) => {
        const { activityId } = req.params;
        const activity = await this.activityService.updateActivity(activityId, req.body);
        sendSuccess(res, 'Activity updated successfully', activity, HttpStatus.OK);
    });

    deleteActivity = asyncHandler(async (req: Request, res: Response) => {
        const { activityId } = req.params;
        await this.activityService.deleteActivity(activityId);
        sendSuccess(res, 'Activity deleted successfully', undefined, HttpStatus.OK);
    });
}
