import { BaseRepository } from './BaseRepository';
import { IMealPlan } from '../interfaces/IModel/IMealPlan';
import { MealPlan } from '../models/MealPlan';
import { IMealPlanRepository } from '../interfaces/IRepository/IMealPlanRepository';

export class MealPlanRepository extends BaseRepository<IMealPlan> implements IMealPlanRepository {
    constructor() {
        super(MealPlan);
    }

    async findByPropertyId(propertyId: string): Promise<IMealPlan[]> {
        return this.model.find({ propertyId, isActive: true });
    }
}
