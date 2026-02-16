import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/errorHandler';
import { sendSuccess } from '../utils/response';
import { IPropertyService } from '../interfaces/IService/IPropertyService';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';

@injectable()
export class PropertyController {
    constructor(
        @inject('PropertyService') private propertyService: IPropertyService
    ) { }

    createProperty = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        const property = await this.propertyService.createProperty(partnerId, req.body);
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property }, HttpStatus.CREATED);
    });

    getPropertyById = asyncHandler(async (req: Request, res: Response) => {
        const property = await this.propertyService.getPropertyById(req.params.id);
        sendSuccess(res, ResponseMessages.PROPERTY_RETRIEVED, { property });
    });

    getPublicPropertyById = asyncHandler(async (req: Request, res: Response) => {
        const property = await this.propertyService.getPublicPropertyById(req.params.id);
        sendSuccess(res, ResponseMessages.PROPERTY_RETRIEVED, { property });
    });

    getPublicProperties = asyncHandler(async (req: Request, res: Response) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 12;
        const properties = await this.propertyService.getPublicProperties({ page, limit }, req.query);
        sendSuccess(res, ResponseMessages.PROPERTIES_RETRIEVED, { properties });
    });

    getPartnerProperties = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        const properties = await this.propertyService.getPropertiesByPartnerId(partnerId);
        sendSuccess(res, ResponseMessages.PROPERTIES_RETRIEVED, { properties });
    });

    updateProperty = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        const property = await this.propertyService.updateProperty(req.params.id, partnerId, req.body);
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    });

    deleteProperty = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        await this.propertyService.deleteProperty(req.params.id, partnerId);
        sendSuccess(res, ResponseMessages.GENERIC_SUCCESS);
    });

    registerPropertyDetails = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        const property = await this.propertyService.registerPropertyDetails(req.params.id, partnerId, req.body);
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    });

    uploadOwnershipDocuments = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        const fileUrls = this.extractFileUrls(req);
        const property = await this.propertyService.uploadOwnershipDocuments(req.params.id, partnerId, fileUrls);
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    });

    uploadTaxDocuments = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        const fileUrls = this.extractFileUrls(req);
        const property = await this.propertyService.uploadTaxDocuments(req.params.id, partnerId, req.body, fileUrls);
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    });

    uploadBankingDetails = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;
        const property = await this.propertyService.uploadBankingDetails(req.params.id, partnerId, req.body);
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    });

    uploadPropertyImages = asyncHandler(async (req: Request, res: Response) => {
        const partnerId = req.user!.userId;

        // Extract raw files and metadata
        const rawFiles = (req.files as any)?.images || [];
        const metadata = req.body.imageMetadata ? JSON.parse(req.body.imageMetadata) : [];

        // Construct images array with new structure
        const images = rawFiles.map((file: any, index: number) => {
            const meta = metadata[index] || {};
            return {
                url: file.location,
                category: meta.category || 'Others',
                label: meta.label || ''
            };
        });

        const coverImage = (req.files as any)?.coverImage?.[0]?.location;

        const property = await this.propertyService.uploadPropertyImages(req.params.id, partnerId, { images, coverImage });
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    });

    getOnboardingStatus = asyncHandler(async (req: Request, res: Response) => {
        const status = await this.propertyService.getOnboardingStatus(req.params.id);
        sendSuccess(res, ResponseMessages.GENERIC_SUCCESS, { status });
    });

    searchProperties = asyncHandler(async (req: Request, res: Response) => {
        const results = await this.propertyService.searchProperties(req.query);
        sendSuccess(res, ResponseMessages.PROPERTIES_RETRIEVED, { results });
    });

    // Admin Actions
    updateDocumentStatus = asyncHandler(async (req: Request, res: Response) => {
        const { section, status, rejectionReason } = req.body;
        const property = await this.propertyService.updatePropertyDocumentStatus(req.params.id, section, status, rejectionReason);
        sendSuccess(res, ResponseMessages.PROPERTY_UPDATED, { property });
    });

    verifyProperty = asyncHandler(async (req: Request, res: Response) => {
        const { status, rejectionReason } = req.body;
        const property = await this.propertyService.verifyProperty(req.params.id, status, rejectionReason);
        sendSuccess(res, status === 'verified' || status === 'approved' ? ResponseMessages.PROPERTY_VERIFIED : ResponseMessages.PROPERTY_REJECTED, { property });
    });

    private extractFileUrls(req: Request): any {
        const files = req.files as any;
        const urls: any = {};
        if (files) {
            Object.keys(files).forEach(key => {
                if (Array.isArray(files[key])) {
                    urls[key] = files[key][0].location;
                }
            });
        }
        return urls;
    }
}
