import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IPackageService } from '../interfaces/IService/IPackageService';
import { HttpStatus } from '../enums/HttpStatus';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/errorHandler';

@injectable()
export class PackageController {
    constructor(
        @inject('PackageService') private packageService: IPackageService
    ) { }

    createPackage = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const pkg = await this.packageService.createPackage(propertyId, req.body);
        sendSuccess(res, 'Package created successfully', pkg, HttpStatus.CREATED);
    });

    getPackages = asyncHandler(async (req: Request, res: Response) => {
        const { propertyId } = req.params;
        const packages = await this.packageService.getPackagesByProperty(propertyId);
        sendSuccess(res, 'Packages fetched successfully', packages, HttpStatus.OK);
    });

    getPackageById = asyncHandler(async (req: Request, res: Response) => {
        const { packageId } = req.params;
        const { checkIn } = req.query;
        const pkg = await this.packageService.getPackageById(packageId, checkIn as string);
        sendSuccess(res, 'Package fetched successfully', pkg, HttpStatus.OK);
    });

    updatePackage = asyncHandler(async (req: Request, res: Response) => {
        const { packageId } = req.params;
        const pkg = await this.packageService.updatePackage(packageId, req.body);
        sendSuccess(res, 'Package updated successfully', pkg, HttpStatus.OK);
    });

    deletePackage = asyncHandler(async (req: Request, res: Response) => {
        const { packageId } = req.params;
        await this.packageService.deletePackage(packageId);
        sendSuccess(res, 'Package deleted successfully', undefined, HttpStatus.OK);
    });
}
