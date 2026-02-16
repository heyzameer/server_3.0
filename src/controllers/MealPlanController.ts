import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IMealPlanService } from '../interfaces/IService/IMealPlanService';
import { HttpStatus } from '../enums/HttpStatus';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/errorHandler';

@injectable()
export class MealPlanController {
    constructor(
        @inject('MealPlanService') private mealPlanService: IMealPlanService
    ) { }

    createMealPlan = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const mealPlan = await this.mealPlanService.createMealPlan(propertyId, req.body);
        sendSuccess(res, 'Meal plan created successfully', mealPlan, HttpStatus.CREATED);
    });

    getMealPlans = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const mealPlans = await this.mealPlanService.getMealPlansByProperty(propertyId);
        sendSuccess(res, 'Meal plans fetched successfully', mealPlans, HttpStatus.OK);
    });

    getMealPlanById = asyncHandler(async (req: Request, res: Response) => {
        const { mealPlanId } = req.params;
        const mealPlan = await this.mealPlanService.getMealPlanById(mealPlanId);
        sendSuccess(res, 'Meal plan fetched successfully', mealPlan, HttpStatus.OK);
    });

    updateMealPlan = asyncHandler(async (req: Request, res: Response) => {
        const { mealPlanId } = req.params;
        const mealPlan = await this.mealPlanService.updateMealPlan(mealPlanId, req.body);
        sendSuccess(res, 'Meal plan updated successfully', mealPlan, HttpStatus.OK);
    });

    deleteMealPlan = asyncHandler(async (req: Request, res: Response) => {
        const { mealPlanId } = req.params;
        await this.mealPlanService.deleteMealPlan(mealPlanId);
        sendSuccess(res, 'Meal plan deleted successfully', undefined, HttpStatus.OK);
    });
}
