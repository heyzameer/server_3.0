import { IPackage } from '../IModel/IPackage';

export interface IPackageService {
    createPackage(propertyId: string, data: any): Promise<IPackage>;
    getPackagesByProperty(propertyId: string): Promise<IPackage[]>;
    getPackageById(id: string, checkIn?: string): Promise<any>;
    updatePackage(id: string, data: any): Promise<IPackage>;
    deletePackage(id: string): Promise<IPackage>;
}
