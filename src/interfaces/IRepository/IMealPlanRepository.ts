import { IMealPlan } from '../IModel/IMealPlan';

export interface IMealPlanRepository {
    create(data: Partial<IMealPlan>): Promise<IMealPlan>;
    findById(id: string): Promise<IMealPlan | null>;
    findByPropertyId(propertyId: string): Promise<IMealPlan[]>;
    update(id: string, data: Partial<IMealPlan>): Promise<IMealPlan | null>;
    delete(id: string): Promise<IMealPlan | null>;
}
