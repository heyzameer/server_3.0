import { injectable, inject } from 'tsyringe';
import { IPackageRepository } from '../interfaces/IRepository/IPackageRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IBookingRepository } from '../interfaces/IRepository/IBookingRepository';
import { IPackage } from '../interfaces/IModel/IPackage';
import { IPackageService } from '../interfaces/IService/IPackageService';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';
import { getSignedFileUrl } from '../middleware/upload';

@injectable()
export class PackageService implements IPackageService {
    constructor(
        @inject('PackageRepository') private packageRepository: IPackageRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository,
        @inject('BookingRepository') private bookingRepository: IBookingRepository
    ) { }

    async createPackage(propertyId: string, data: any): Promise<IPackage> {
        let property;
        if (mongoose.isValidObjectId(propertyId)) {
            property = await this.propertyRepository.findById(propertyId);
        } else {
            property = await this.propertyRepository.findByPropertyId(propertyId);
        }

        if (!property) throw new AppError('Property not found', HttpStatus.NOT_FOUND);

        const packageData = { ...data, propertyId: property._id, isActive: true };
        const pkg = await this.packageRepository.create(packageData);
        return this.injectSignedUrls(pkg);
    }

    async getPackagesByProperty(propertyId: string): Promise<IPackage[]> {
        let property;
        if (mongoose.isValidObjectId(propertyId)) {
            property = await this.propertyRepository.findById(propertyId);
        } else {
            property = await this.propertyRepository.findByPropertyId(propertyId);
        }

        if (!property) throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        const packages = await this.packageRepository.findByPropertyId(property._id as any);
        return Promise.all(packages.map(pkg => this.injectSignedUrls(pkg)));
    }

    async getPackageById(id: string, checkIn?: string): Promise<any> {
        const pkg = await this.packageRepository.findById(id);
        if (!pkg) throw new AppError('Package not found', HttpStatus.NOT_FOUND);

        const pkgObj = (pkg as any).toObject ? (pkg as any).toObject() : pkg;

        if (checkIn) {
            try {
                const startDate = new Date(checkIn);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + pkg.numberOfNights);

                const bookings = await this.bookingRepository.find({
                    packageId: pkg._id,
                    status: { $nin: ['cancelled', 'rejected', 'refund_processed'] },
                    $or: [
                        { checkInDate: { $lt: endDate }, checkOutDate: { $gt: startDate } }
                    ]
                });

                const occupiedSlots = bookings.reduce((sum, b) => sum + (b.totalGuests || 0), 0);
                pkgObj.remainingSlots = Math.max(0, pkg.maxPersons - occupiedSlots);
            } catch (error) {
                pkgObj.remainingSlots = pkg.maxPersons;
            }
        } else {
            pkgObj.remainingSlots = pkg.maxPersons;
        }

        return this.injectSignedUrls(pkgObj);
    }

    async updatePackage(id: string, data: any): Promise<IPackage> {
        const pkg = await this.packageRepository.update(id, data);
        if (!pkg) throw new AppError('Package not found', HttpStatus.NOT_FOUND);
        return this.injectSignedUrls(pkg);
    }

    async deletePackage(id: string): Promise<IPackage> {
        const pkg = await this.packageRepository.update(id, { isActive: false } as any);
        if (!pkg) throw new AppError('Package not found', HttpStatus.NOT_FOUND);
        return pkg;
    }

    public async injectSignedUrls(pkg: any): Promise<any> {
        const pkgObj = pkg.toObject ? pkg.toObject() : pkg;
        if (pkgObj.images && pkgObj.images.length > 0) {
            pkgObj.images = await Promise.all(pkgObj.images.map(async (img: any) => {
                if (typeof img === 'string') return await getSignedFileUrl(img);
                if (img && img.url) return await getSignedFileUrl(img.url);
                return img;
            }));
        }
        return pkgObj;
    }
}
