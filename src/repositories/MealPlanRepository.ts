import { BaseRepository } from './BaseRepository';
import { IMealPlan } from '../interfaces/IModel/IMealPlan';
import { MealPlan } from '../models/MealPlan';

export interface IMealPlanRepository {
    create(data: Partial<IMealPlan>): Promise<IMealPlan>;
    findById(id: string): Promise<IMealPlan | null>;
    findByPropertyId(propertyId: string): Promise<IMealPlan[]>;
    update(id: string, data: Partial<IMealPlan>): Promise<IMealPlan | null>;
    delete(id: string): Promise<IMealPlan | null>;
}

export class MealPlanRepository extends BaseRepository<IMealPlan> implements IMealPlanRepository {
    constructor() {
        super(MealPlan);
    }

    async findByPropertyId(propertyId: string): Promise<IMealPlan[]> {
        return this.model.find({ propertyId, isActive: true });
    }

    // Override delete to soft delete if needed, or stick to BaseRepository's delete (which is usually hard delete or soft depending on base)
    // Assuming BaseRepository has generic delete, but let's implement checking active status logic if needed. 
    // For now, standard CRUD is fine.
}
