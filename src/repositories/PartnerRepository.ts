// src/repositories/PartnerRepository.ts
import { injectable } from 'tsyringe';
import { FilterQuery } from 'mongoose';
import { BaseRepository } from './BaseRepository';
import { Partner, PartnerStatus } from '../models/Partner';
import { PaginationOptions, PaginatedResult, DocumentStatus } from '../types';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';
import { IPartner } from '../interfaces/IModel/IPartner';

@injectable()
export class PartnerRepository extends BaseRepository<IPartner> implements IPartnerRepository {
  constructor() {
    super(Partner);
  }

  async updatePartnerStatus(partnerId: string, updateData: Partial<IPartner>): Promise<IPartner | null> {
    return this.model.findByIdAndUpdate(
      partnerId,
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async findByEmail(email: string): Promise<IPartner | null> {
    return this.model.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByPartnerId(partnerId: string): Promise<IPartner | null> {
    return this.model.findOne({ partnerId }).exec();
  }

  async findByMobileNumber(phone: string): Promise<IPartner | null> {
    return this.model.findOne({ phone }).exec();
  }


  async findByEmailOrMobile(email: string, phone: string): Promise<IPartner | null> {
    return this.model.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    }).exec();
  }

  async findActivePartners(pagination: PaginationOptions): Promise<PaginatedResult<IPartner>> {
    return this.findWithPagination({ isActive: true }, pagination);
  }

  async findByStatus(status: PartnerStatus, pagination: PaginationOptions): Promise<PaginatedResult<IPartner>> {
    return this.findWithPagination({ status, isActive: true }, pagination);
  }

  async findVerifiedPartners(pagination?: PaginationOptions): Promise<PaginatedResult<IPartner> | IPartner[]> {
    const filter: FilterQuery<IPartner> = {
      status: PartnerStatus.VERIFIED,
      isVerified: true,
      isActive: true
    };

    if (pagination) {
      return this.findWithPagination(filter, pagination);
    }

    return this.find(filter);
  }

  async findUnverifiedPartners(pagination: PaginationOptions): Promise<PaginatedResult<IPartner>> {
    const filter: FilterQuery<IPartner> = {
      status: { $ne: PartnerStatus.PENDING },
      isActive: true
    };

    return this.findWithPagination(filter, pagination);
  }

  async updateLastLogin(partnerId: string): Promise<IPartner | null> {
    return this.update(partnerId, { lastLoginAt: new Date() });
  }

  async addDocument(partnerId: string, document: any): Promise<IPartner | null> {
    return this.model.findByIdAndUpdate(
      partnerId,
      { $push: { documents: document } },
      { new: true }
    ).exec();
  }

  async updateDocumentStatus(
    partnerId: string,
    documentType: string,
    status: DocumentStatus,
    rejectionReason?: string
  ): Promise<IPartner | null> {
    const updateData: any = {
      'documents.$.status': status,
      'documents.$.updatedAt': new Date()
    };

    if (rejectionReason) {
      updateData['documents.$.rejectionReason'] = rejectionReason;
    }

    return this.model.findOneAndUpdate(
      { _id: partnerId, 'documents.type': documentType },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async getDocumentsByPartnerId(partnerId: string): Promise<IPartner | null> {
    return this.model.findById(partnerId).exec();
  }

  async searchPartners(searchTerm: string, pagination: PaginationOptions): Promise<PaginatedResult<IPartner>> {
    const filter: FilterQuery<IPartner> = {
      isActive: true,
      $or: [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { mobileNumber: { $regex: searchTerm, $options: 'i' } },
        { partnerId: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    return this.findWithPagination(filter, pagination);
  }

  async updateVerificationStatus(partnerId: string, isVerified: boolean): Promise<IPartner | null> {
    const status = isVerified ? PartnerStatus.VERIFIED : PartnerStatus.PENDING;
    return this.update(partnerId, { isVerified, status });
  }

  async findByAadharStatus(status: string, pagination: PaginationOptions): Promise<PaginatedResult<IPartner>> {
    const filter = {
      'personalDocuments.aadharStatus': status,
      isActive: true
    };
    return this.findWithPagination(filter, pagination);
  }

  async findAll(filter: FilterQuery<IPartner>, pagination: PaginationOptions): Promise<PaginatedResult<IPartner>> {
    return this.findWithPagination(filter, pagination);
  }
}