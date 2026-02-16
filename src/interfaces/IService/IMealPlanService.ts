import { IMealPlan } from '../IModel/IMealPlan';

export interface IMealPlanService {
    createMealPlan(propertyId: string, data: any): Promise<IMealPlan>;
    getMealPlansByProperty(propertyId: string): Promise<IMealPlan[]>;
    getMealPlanById(id: string): Promise<IMealPlan>;
    updateMealPlan(id: string, data: any): Promise<IMealPlan>;
    deleteMealPlan(id: string): Promise<IMealPlan>;
}
