import { BaseRepository } from './BaseRepository';
import { IPackage } from '../interfaces/IModel/IPackage';
import { Package } from '../models/Package';

export interface IPackageRepository {
    create(data: Partial<IPackage>): Promise<IPackage>;
    findById(id: string): Promise<IPackage | null>;
    findByPropertyId(propertyId: string): Promise<IPackage[]>;
    update(id: string, data: Partial<IPackage>): Promise<IPackage | null>;
    delete(id: string): Promise<IPackage | null>;
}

export class PackageRepository extends BaseRepository<IPackage> implements IPackageRepository {
    constructor() {
        super(Package);
    }

    async findByPropertyId(propertyId: string): Promise<IPackage[]> {
        return this.model.find({ propertyId, isActive: true })
            .populate('mealPlanId', 'name')
            .populate('includedActivities.activityId', 'name');
    }

    async findById(id: string): Promise<IPackage | null> {
        return this.model.findById(id)
            .populate('mealPlanId', 'name')
            .populate('includedActivities.activityId', 'name');
    }
}
