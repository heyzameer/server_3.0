import { BaseRepository } from './BaseRepository';
import { IPackage } from '../interfaces/IModel/IPackage';
import { Package } from '../models/Package';
import { IPackageRepository } from '../interfaces/IRepository/IPackageRepository';

export class PackageRepository extends BaseRepository<IPackage> implements IPackageRepository {
    constructor() {
        super(Package);
    }

    async findByPropertyId(propertyId: string): Promise<IPackage[]> {
        return this.model.find({ propertyId, isActive: true })
            .populate('propertyId', 'propertyName address city state')
            .populate('mealPlanId', 'name')
            .populate('includedActivities.activityId', 'name');
    }

    async findById(id: string): Promise<IPackage | null> {
        return this.model.findById(id)
            .populate('propertyId', 'propertyName address city state')
            .populate('mealPlanId', 'name')
            .populate('includedActivities.activityId', 'name');
    }
}
