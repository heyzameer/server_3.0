import { IPackage } from '../IModel/IPackage';

export interface IPackageRepository {
    create(data: Partial<IPackage>): Promise<IPackage>;
    findById(id: string): Promise<IPackage | null>;
    findByPropertyId(propertyId: string): Promise<IPackage[]>;
    update(id: string, data: Partial<IPackage>): Promise<IPackage | null>;
    delete(id: string): Promise<IPackage | null>;
}
