import { injectable, inject } from 'tsyringe';
import { IMealPlanRepository } from '../interfaces/IRepository/IMealPlanRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IMealPlan } from '../interfaces/IModel/IMealPlan';
import { IMealPlanService } from '../interfaces/IService/IMealPlanService';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';

@injectable()
export class MealPlanService implements IMealPlanService {
    constructor(
        @inject('MealPlanRepository') private mealPlanRepository: IMealPlanRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository
    ) { }

    async createMealPlan(propertyId: string, data: any): Promise<IMealPlan> {
        let property;
        if (mongoose.isValidObjectId(propertyId)) {
            property = await this.propertyRepository.findById(propertyId);
        } else {
            property = await this.propertyRepository.findByPropertyId(propertyId);
        }

        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        const mealPlanData = {
            ...data,
            propertyId: property._id
        };
        return await this.mealPlanRepository.create(mealPlanData);
    }

    async getMealPlansByProperty(propertyId: string): Promise<IMealPlan[]> {
        let property;
        if (mongoose.isValidObjectId(propertyId)) {
            property = await this.propertyRepository.findById(propertyId);
        } else {
            property = await this.propertyRepository.findByPropertyId(propertyId);
        }

        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }
        return await this.mealPlanRepository.findByPropertyId(property._id as any);
    }

    async getMealPlanById(id: string): Promise<IMealPlan> {
        const mealPlan = await this.mealPlanRepository.findById(id);
        if (!mealPlan) {
            throw new AppError('Meal plan not found', HttpStatus.NOT_FOUND);
        }
        return mealPlan;
    }

    async updateMealPlan(id: string, data: any): Promise<IMealPlan> {
        const mealPlan = await this.mealPlanRepository.update(id, data);
        if (!mealPlan) {
            throw new AppError('Meal plan not found', HttpStatus.NOT_FOUND);
        }
        return mealPlan;
    }

    async deleteMealPlan(id: string): Promise<IMealPlan> {
        // We might want to soft delete instead of hard delete
        // For now, let's just update isActive to false
        const mealPlan = await this.mealPlanRepository.update(id, { isActive: false } as any);
        if (!mealPlan) {
            throw new AppError('Meal plan not found', HttpStatus.NOT_FOUND);
        }
        return mealPlan;
    }
}
