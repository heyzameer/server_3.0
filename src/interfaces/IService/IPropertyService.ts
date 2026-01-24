import { IProperty } from '../IModel/IProperty';
import { PaginationOptions, PaginatedResult } from '../../types';

export interface IPropertyService {
    createProperty(partnerId: string, propertyData: any): Promise<IProperty>;
    getPropertyById(id: string): Promise<IProperty>;
    getPublicPropertyById(id: string): Promise<IProperty>; // New method
    getPropertiesByPartnerId(partnerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]>;
    updateProperty(id: string, partnerId: string, updateData: any): Promise<IProperty>;
    deleteProperty(id: string, partnerId: string): Promise<void>;

    // Step-by-step onboarding
    registerPropertyDetails(id: string, partnerId: string, details: any): Promise<IProperty>;
    uploadOwnershipDocuments(id: string, partnerId: string, files: any): Promise<IProperty>;
    uploadTaxDocuments(id: string, partnerId: string, taxData: any, files: any): Promise<IProperty>;
    uploadBankingDetails(id: string, partnerId: string, bankingData: any): Promise<IProperty>;
    uploadPropertyImages(id: string, partnerId: string, files: any): Promise<IProperty>;

    // Document handling
    updatePropertyDocumentStatus(id: string, section: string, status: string, rejectionReason?: string): Promise<IProperty>;

    // Search & Admin
    searchProperties(query: any, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]>;
    getPublicProperties(pagination?: PaginationOptions, filters?: any): Promise<PaginatedResult<IProperty>>;
    getAllProperties(pagination: PaginationOptions, filters?: any): Promise<PaginatedResult<IProperty>>;
    getPendingProperties(pagination: PaginationOptions): Promise<PaginatedResult<IProperty>>; // New method for admin
    getPropertyVerificationDetails(id: string): Promise<any>; // New method for admin verification
    getOnboardingStatus(id: string): Promise<any>;
    verifyProperty(id: string, status: string, rejectionReason?: string): Promise<IProperty>;
    adminUpdateProperty(id: string, updateData: any): Promise<IProperty>;
}
