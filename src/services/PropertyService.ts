import { injectable, inject } from 'tsyringe';
import mongoose from 'mongoose';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';
import { IPropertyService } from '../interfaces/IService/IPropertyService';
import { IProperty } from '../interfaces/IModel/IProperty';
import { IRoom } from '../interfaces/IModel/IRoom';
import { createError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';
import { logger } from '../utils/logger';
import { PaginatedResult, PaginationOptions } from '../types';
import { IEmailService } from '../interfaces/IService/IEmailService';
import { getSignedFileUrl } from '../middleware/upload';
import { IRoomRepository } from '../interfaces/IRepository/IRoomRepository';

@injectable()
export class PropertyService implements IPropertyService {
    constructor(
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository,
        @inject('PartnerRepository') private partnerRepository: IPartnerRepository,
        @inject('EmailService') private emailService: IEmailService,
        @inject('RoomRepository') private roomRepository: IRoomRepository
    ) { }

    async createProperty(partnerId: string, propertyData: any): Promise<IProperty> {
        try {
            const partner = await this.partnerRepository.findById(partnerId);
            if (!partner) {
                throw createError(ResponseMessages.PARTNER_NOT_FOUND, HttpStatus.NOT_FOUND);
            }

            // Business Logic: Must be Aadhaar verified
            if (!partner.aadhaarVerified) {
                throw createError('Please complete Aadhaar verification before adding properties.', HttpStatus.FORBIDDEN);
            }

            const propertyId = this.generatePropertyId();

            const property = await this.propertyRepository.create({
                ...propertyData,
                partnerId: partner._id,
                propertyId,
                isActive: false,
                isVerified: false,
                propertyDetailsCompleted: true // Mark property details as completed
            });

            logger.info(`Property created: ${propertyId} for partner ${partnerId}`);
            return property;
        } catch (error) {
            logger.error('Failed to create property:', error);
            throw error;
        }
    }

    async registerPropertyDetails(id: string, partnerId: string, details: any): Promise<IProperty> {
        await this.verifyOwnership(id, partnerId);
        const updated = await this.propertyRepository.update(id, {
            ...details,
            propertyDetailsCompleted: true
        });
        return this.checkOnboardingCompletion(updated!);
    }

    async uploadOwnershipDocuments(id: string, partnerId: string, files: any): Promise<IProperty> {
        await this.verifyOwnership(id, partnerId);
        const updated = await this.propertyRepository.update(id, {
            ownershipDocuments: {
                ownershipProof: files.ownershipProof,
                ownerKYC: files.ownerKYC,
                ownershipProofStatus: 'pending',
                ownerKYCStatus: 'pending'
            },
            ownershipDocumentsCompleted: true
        });
        return this.checkOnboardingCompletion(updated!);
    }

    async uploadTaxDocuments(id: string, partnerId: string, taxData: any, files: any): Promise<IProperty> {
        await this.verifyOwnership(id, partnerId);
        const updated = await this.propertyRepository.update(id, {
            taxDocuments: {
                ...taxData,
                gstCertificate: files.gstCertificate,
                panCard: files.panCard,
                taxStatus: 'pending'
            },
            taxDocumentsCompleted: true
        });
        return this.checkOnboardingCompletion(updated!);
    }

    async uploadBankingDetails(id: string, partnerId: string, bankingData: any): Promise<IProperty> {
        await this.verifyOwnership(id, partnerId);
        const updated = await this.propertyRepository.update(id, {
            bankingDetails: {
                ...bankingData,
                bankingStatus: 'pending'
            },
            bankingDetailsCompleted: true
        });
        return this.checkOnboardingCompletion(updated!);
    }

    async uploadPropertyImages(id: string, partnerId: string, files: any): Promise<IProperty> {
        await this.verifyOwnership(id, partnerId);

        // files.images should now be an array of objects { url, category, label }
        // We assume the controller constructs this array

        const updated = await this.propertyRepository.update(id, {
            images: files.images,
            coverImage: files.coverImage,
            imagesUploaded: true
        });
        return this.checkOnboardingCompletion(updated!);
    }

    async updatePropertyDocumentStatus(id: string, section: string, status: string, rejectionReason?: string): Promise<IProperty> {
        const updatedProperty = await this.propertyRepository.updateDocumentStatus(id, section, status, rejectionReason);
        if (!updatedProperty) {
            throw createError('Failed to update document status', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Notify partner
        const partner = await this.partnerRepository.findById(updatedProperty.partnerId.toString());
        if (partner) {
            const subject = `Property Verification Update: ${updatedProperty.propertyName}`;
            const message = status === 'approved'
                ? `Your ${section} documents for ${updatedProperty.propertyName} have been approved.`
                : `Your ${section} documents for ${updatedProperty.propertyName} were rejected. Reason: ${rejectionReason}`;

            await this.emailService.sendCustomEmail(partner.email, subject, message);
        }

        return updatedProperty;
    }

    async verifyProperty(id: string, status: string, rejectionReason?: string): Promise<IProperty> {
        const isVerified = status === 'verified';
        const updateData: any = {
            verificationStatus: status,
            isVerified,
            isActive: isVerified // Activate if verified
        };

        if (isVerified) {
            updateData.verifiedAt = new Date();
        } else if (status === 'rejected' && rejectionReason) {
            updateData.overallRejectionReason = rejectionReason;
        }

        const updated = await this.propertyRepository.update(id, updateData);

        if (!updated) throw createError('Property not found', HttpStatus.NOT_FOUND);

        // Notify partner
        const partner = await this.partnerRepository.findById(updated.partnerId.toString());
        if (partner) {
            const subject = `Property Verification: ${updated.propertyName}`;
            const message = isVerified
                ? `Congratulations! Your property ${updated.propertyName} has been verified and is now active.`
                : `Your property ${updated.propertyName} verification was ${status}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`;

            await this.emailService.sendCustomEmail(partner.email, subject, message);
        }

        logger.info(`Property ${updated.propertyId} ${status} by admin`);
        return updated;
    }

    async getProperty(id: string): Promise<IProperty> {
        let prop;

        if (mongoose.Types.ObjectId.isValid(id)) {
            prop = await this.propertyRepository.findById(id);
        } else {
            prop = await this.propertyRepository.findByPropertyId(id);
        }

        if (!prop) {
            throw createError(ResponseMessages.PROPERTY_NOT_FOUND, HttpStatus.NOT_FOUND);
        }

        return prop;
    }

    async getPropertyById(id: string): Promise<IProperty> {
        logger.info(`PropertyService: Fetching property ${id}`);
        const property = await this.getProperty(id); // Use the new getProperty method
        logger.info(`PropertyService: Property ${id} found, injecting signed URLs`);
        return this.injectSignedUrls(property);
    }

    async getPublicPropertyById(id: string): Promise<IProperty> {
        logger.info(`PropertyService: Fetching public property ${id}`);
        const property = await this.propertyRepository.findById(id);

        if (!property) {
            throw createError('Property not found', HttpStatus.NOT_FOUND);
        }

        // For public access, strictly require verified and active status
        if (!property.isVerified || !property.isActive) {
            logger.warn(`PropertyService: Public access denied for property ${id} (verified: ${property.isVerified}, active: ${property.isActive})`);
            throw createError('Property not found', HttpStatus.NOT_FOUND);
        }

        // Inject signed URLs
        let signedProperty = await this.injectSignedUrls(property);

        // Inject Base Price
        signedProperty = await this.injectMinPrice(signedProperty);

        // Convert to object to safely delete sensitive fields if needed, 
        // though strictly typing might make this tricky. 
        // For now, we rely on the controller or assumes frontend ignores extra fields.
        // But optimally we should set sensitive fields to undefined/null.

        // Note: The caller expects IProperty, so we return it as is, 
        // trusting the frontend not to display sensitive data, 
        // or we could explicitly nullify them here if the Object is mutable.
        const propObj = signedProperty['toObject'] ? (signedProperty as any).toObject() : signedProperty;
        delete propObj.ownershipDocuments;
        delete propObj.taxDocuments;
        delete propObj.bankingDetails;

        return propObj;
    }

    async getPropertiesByPartnerId(partnerId: string, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]> {
        const result = await this.propertyRepository.findByPartnerId(partnerId, pagination);

        const inject = async (prop: IProperty) => {
            const signed = await this.injectSignedUrls(prop);
            return this.injectMinPrice(signed);
        };

        if (Array.isArray(result)) {
            return Promise.all(result.map(inject));
        } else {
            const properties = await Promise.all(result.data.map(inject));
            return { ...result, data: properties };
        }
    }

    async updateProperty(id: string, partnerId: string, updateData: any): Promise<IProperty> {
        await this.verifyOwnership(id, partnerId);
        const updatedProperty = await this.propertyRepository.update(id, updateData);
        if (!updatedProperty) {
            throw createError('Failed to update property', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return this.checkOnboardingCompletion(updatedProperty);
    }

    async deleteProperty(id: string, partnerId: string): Promise<void> {
        await this.verifyOwnership(id, partnerId);
        await this.propertyRepository.delete(id);
        logger.info(`Property deleted: ${id}`);
    }

    async adminUpdateProperty(id: string, updateData: any): Promise<IProperty> {
        const updatedProperty = await this.propertyRepository.update(id, updateData);
        if (!updatedProperty) {
            throw createError('Failed to update property', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return this.injectSignedUrls(updatedProperty);
    }

    async getPublicProperties(pagination?: PaginationOptions, filters: any = {}): Promise<PaginatedResult<IProperty>> {
        try {
            const publicFilters = {
                ...filters,
                verificationStatus: 'verified',
                isActive: true,
                onboardingCompleted: true
            };
            const pageOptions = pagination || { page: 1, limit: 12 };
            const result = await this.propertyRepository.findAllWithFilters(pageOptions, publicFilters);
            const properties = await Promise.all(result.data.map(async (prop) => {
                const signed = await this.injectSignedUrls(prop);
                return this.injectMinPrice(signed);
            }));
            return { ...result, data: properties };
        } catch (error) {
            logger.error('Failed to fetch public properties:', error);
            throw error;
        }
    }

    async searchProperties(query: any, pagination?: PaginationOptions): Promise<PaginatedResult<IProperty> | IProperty[]> {
        let results: PaginatedResult<IProperty> | IProperty[];

        if (query.longitude && query.latitude) {
            results = await this.propertyRepository.findNear(query.longitude, query.latitude, query.maxDistance || 10000);
        } else {
            // Use unified filter search for city, destinationId, and text search
            results = await this.propertyRepository.findAllWithFilters(pagination || { page: 1, limit: 12 }, query);
        }

        const inject = async (prop: IProperty) => {
            const signed = await this.injectSignedUrls(prop);
            return this.injectMinPrice(signed);
        };

        if (Array.isArray(results)) {
            return Promise.all(results.map(inject));
        } else {
            const properties = await Promise.all(results.data.map(inject));
            return { ...results, data: properties };
        }
    }

    async getAllProperties(pagination: PaginationOptions, filters?: any): Promise<PaginatedResult<IProperty>> {
        try {
            logger.info(`PropertyService: Fetching all properties with filters: ${JSON.stringify(filters)}`);
            const result = await this.propertyRepository.findAllWithFilters(pagination, filters || {});
            logger.info(`PropertyService: Found ${result.data.length} properties, injecting signed URLs`);
            const properties = await Promise.all(result.data.map(prop => this.injectSignedUrls(prop)));
            return { ...result, data: properties };
        } catch (error) {
            logger.error('Failed to fetch all properties:', error);
            throw error;
        }
    }

    async getOnboardingStatus(id: string): Promise<any> {
        const property = await this.getPropertyById(id);
        return {
            progress: property.getOnboardingProgress(),
            nextStep: property.getNextOnboardingStep(),
            isComplete: property.isOnboardingComplete(),
            flags: {
                ownership: property.ownershipDocumentsCompleted,
                tax: property.taxDocumentsCompleted,
                banking: property.bankingDetailsCompleted,
                details: property.propertyDetailsCompleted,
                images: property.imagesUploaded
            }
        };
    }

    async getPendingProperties(pagination: PaginationOptions): Promise<PaginatedResult<IProperty>> {
        try {
            const filters = {
                verificationStatus: 'pending',
                onboardingCompleted: true
            };
            const result = await this.propertyRepository.findAllWithFilters(pagination, filters);
            const properties = await Promise.all(result.data.map(prop => this.injectSignedUrls(prop)));
            return { ...result, data: properties };
        } catch (error) {
            logger.error('Failed to fetch pending properties:', error);
            throw error;
        }
    }

    async getPropertyVerificationDetails(id: string): Promise<any> {
        try {
            const property = await this.getPropertyById(id);
            const partner = await this.partnerRepository.findById(property.partnerId.toString());

            return {
                property,
                partner: partner ? {
                    partnerId: partner.partnerId,
                    fullName: partner.fullName,
                    email: partner.email,
                    phone: partner.phone
                } : null,
                verificationStatus: {
                    overall: property.verificationStatus,
                    ownership: {
                        proofStatus: property.ownershipDocuments.ownershipProofStatus,
                        kycStatus: property.ownershipDocuments.ownerKYCStatus,
                        rejectionReason: property.ownershipDocuments.rejectionReason
                    },
                    tax: {
                        status: property.taxDocuments.taxStatus,
                        rejectionReason: property.taxDocuments.rejectionReason
                    },
                    banking: {
                        status: property.bankingDetails.bankingStatus,
                        rejectionReason: property.bankingDetails.rejectionReason
                    }
                },
                submittedAt: property.submittedForVerificationAt,
                verifiedAt: property.verifiedAt
            };
        } catch (error) {
            logger.error('Failed to fetch property verification details:', error);
            throw error;
        }
    }

    private async verifyOwnership(id: string, partnerId: string): Promise<IProperty> {
        const property = await this.getPropertyById(id);
        if (property.partnerId.toString() !== partnerId) {
            throw createError('Unauthorized access to property', HttpStatus.FORBIDDEN);
        }
        return property;
    }

    private async checkOnboardingCompletion(property: IProperty): Promise<IProperty> {
        if (property.isOnboardingComplete()) {
            if (!property.onboardingCompleted) {
                // Initial onboarding completion
                const updated = await this.propertyRepository.update(property._id.toString(), {
                    onboardingCompleted: true,
                    verificationStatus: 'pending', // Ready for admin review
                    submittedForVerificationAt: new Date()
                });
                logger.info(`Property ${property.propertyId} completed onboarding and submitted for initial verification`);
                return updated!;
            } else if (property.verificationStatus === 'verified' || property.verificationStatus === 'rejected') {
                // Reset status to pending after edit for verified or rejected properties
                const updated = await this.propertyRepository.update(property._id.toString(), {
                    verificationStatus: 'pending',
                    isVerified: false,
                    isActive: false, // Must be re-verified before going live again
                    submittedForVerificationAt: new Date()
                });
                logger.info(`Property ${property.propertyId} status reset to pending due to edit`);
                return updated!;
            }
        }
        return property;
    }

    private generatePropertyId(): string {
        return 'PROP' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    }

    private async injectSignedUrls(property: IProperty): Promise<IProperty> {
        const prop = property.toObject ? property.toObject() : property;

        try {
            if (prop.coverImage) {
                prop.coverImage = await getSignedFileUrl(prop.coverImage);
            }

            if (prop.images && prop.images.length > 0) {
                // Check if images are strings (old format) or objects (new format)
                prop.images = await Promise.all(prop.images.map(async (img: any) => {
                    if (typeof img === 'string') {
                        // Migration fallback or unexpected string
                        const signed = await getSignedFileUrl(img);
                        return { url: signed, category: 'Others' };
                    } else {
                        // New format: { url, category, label }
                        img.url = await getSignedFileUrl(img.url);
                        return img;
                    }
                }));
            }

            if (prop.ownershipDocuments) {
                if (prop.ownershipDocuments.ownershipProof) {
                    prop.ownershipDocuments.ownershipProof = await getSignedFileUrl(prop.ownershipDocuments.ownershipProof);
                }
                if (prop.ownershipDocuments.ownerKYC) {
                    prop.ownershipDocuments.ownerKYC = await getSignedFileUrl(prop.ownershipDocuments.ownerKYC);
                }
            }

            if (prop.taxDocuments) {
                if (prop.taxDocuments.gstCertificate) {
                    prop.taxDocuments.gstCertificate = await getSignedFileUrl(prop.taxDocuments.gstCertificate);
                }
                if (prop.taxDocuments.panCard) {
                    prop.taxDocuments.panCard = await getSignedFileUrl(prop.taxDocuments.panCard);
                }
            }
        } catch (error) {
            logger.error(`Error injecting signed URLs for property ${prop._id}:`, error);
        }

        return prop as IProperty;
    }

    private async injectMinPrice(property: IProperty): Promise<IProperty> {
        const prop = property.toObject ? property.toObject() : property;
        try {
            const rooms = await this.roomRepository.findByPropertyId(prop._id.toString());
            if (rooms && rooms.length > 0) {
                // Find minimum price among active rooms
                const minPrice = rooms.reduce((min: number, room: IRoom) => {
                    return (room.basePricePerNight < min) ? room.basePricePerNight : min;
                }, Infinity);

                prop.basePrice = (minPrice === Infinity) ? 0 : minPrice;
                prop.pricePerNight = prop.basePrice;
            } else {
                prop.basePrice = 0;
                prop.pricePerNight = 0;
            }
        } catch (error) {
            logger.error(`Error injecting min price for property ${prop._id}:`, error);
            prop.basePrice = 0;
            prop.pricePerNight = 0;
        }
        return prop as IProperty;
    }
}
