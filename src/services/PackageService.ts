import { injectable, inject } from 'tsyringe';
import { IPackageRepository } from '../repositories/PackageRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IPackage } from '../interfaces/IModel/IPackage';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';

export interface IPackageService {
    createPackage(propertyId: string, data: any): Promise<IPackage>;
    getPackagesByProperty(propertyId: string): Promise<IPackage[]>;
    getPackageById(id: string): Promise<IPackage>;
    updatePackage(id: string, data: any): Promise<IPackage>;
    deletePackage(id: string): Promise<IPackage>;
}

@injectable()
export class PackageService implements IPackageService {
    constructor(
        @inject('PackageRepository') private packageRepository: IPackageRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository
    ) { }

    async createPackage(propertyId: string, data: any): Promise<IPackage> {
        const property = await this.propertyRepository.findByPropertyId(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        const packageData = {
            ...data,
            propertyId: property._id,
            isActive: true
        };
        return await this.packageRepository.create(packageData);
    }

    async getPackagesByProperty(propertyId: string): Promise<IPackage[]> {
        const property = await this.propertyRepository.findByPropertyId(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }
        return await this.packageRepository.findByPropertyId(property._id as any);
    }

    async getPackageById(id: string): Promise<IPackage> {
        const pkg = await this.packageRepository.findById(id);
        if (!pkg) {
            throw new AppError('Package not found', HttpStatus.NOT_FOUND);
        }
        return pkg;
    }

    async updatePackage(id: string, data: any): Promise<IPackage> {
        const pkg = await this.packageRepository.update(id, data);
        if (!pkg) {
            throw new AppError('Package not found', HttpStatus.NOT_FOUND);
        }
        return pkg;
    }

    async deletePackage(id: string): Promise<IPackage> {
        const pkg = await this.packageRepository.update(id, { isActive: false } as any);
        if (!pkg) {
            throw new AppError('Package not found', HttpStatus.NOT_FOUND);
        }
        return pkg;
    }
}
