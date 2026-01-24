import { PartnerRegistrationData, BasicPartnerRegistrationData, PaginationOptions, PaginatedResult } from '../../types';
import { IPartner } from '../IModel/IPartner';
import { IProperty } from '../IModel/IProperty';

/**
 * Service interface for partner-related operations.
 */
export interface IPartnerService {
    /**
     * Verify Aadhaar documents for an existing partner.
     * @param partnerId - Partner's ID from auth token.
     * @param fileUrls - Map of document type to S3 URL.
     * @param dateOfBirth - Optional date of birth.
     * @returns Promise resolving to the updated partner and success message.
     */
    verifyAadhar(partnerId: string, fileUrls: { [key: string]: string }, dateOfBirth?: string): Promise<{ partner: IPartner; message: string; accessToken: string; refreshToken: string }>;

    /**
     * Register a partner with basic details only.
     * @param registrationData - Basic partner data.
     */
    registerPartner(registrationData: BasicPartnerRegistrationData): Promise<{ partner: IPartner; message: string; accessToken: string; refreshToken: string }>;

    /**
     * Request a login OTP for a partner.
     * @param email - The partner's email.
     */
    requestLoginOtp(email: string): Promise<{ message: string }>;

    /**
     * Verify a login OTP.
     * @param email - The partner's email.
     * @param otp - The OTP code.
     */
    verifyLoginOtp(email: string, otp: string): Promise<{ user: any; accessToken: string; refreshToken: string }>;

    /**
     * Get the verification status of a partner.
     * @param partnerId - The partner's ID.
     */
    getVerificationStatus(partnerId: string): Promise<{ isVerified: boolean; aadhaarVerified: boolean }>;

    /**
     * Get the current partner details.
     * @param partnerId - The partner's ID.
     */
    getCurrentPartner(partnerId: string): Promise<IPartner>;

    /**
     * Refresh the partner's access token.
     * @param refreshToken - The refresh token.
     */
    refreshToken(refreshToken: string): Promise<{ accessToken: string }>;

    /**
     * Update the status of a partner's Aadhaar or banking document.
     * @param partnerId - The partner's ID.
     * @param documentType - The type of document.
     * @param status - The new status.
     * @param rejectionReason - Optional reason for rejection.
     */
    updateDocumentStatus(partnerId: string, documentType: 'aadhar' | 'banking', status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Promise<void>;

    /**
     * Get all partners.
     * @param pagination - Pagination options.
     * @param filter - Optional filter criteria.
     */
    getAllPartners(pagination?: PaginationOptions, filter?: any): Promise<PaginatedResult<IPartner> | IPartner[]>;

    /**
     * Update partner status.
     * @param partnerId - The partner's ID.
     * @param updateData - Data to update.
     */
    updatePartnerStatus(partnerId: string, updateData: Partial<IPartner>): Promise<IPartner | null>;

    /**
     * Get simplified verification status for Aadhaar.
     * @param partnerId - The partner's ID.
     */
    getDetailedVerificationStatus(partnerId: string): Promise<{
        isVerified: boolean;
        aadhaarStatus: string;
        totalProperties: number;
        canAddProperty: boolean;
    }>;

    sendEmailToPartner(email: string, subject: string, message: string): Promise<void>;

    /**
     * Check if a partner can add a new property.
     * @param partnerId - The partner's ID.
     */
    canAddProperty(partnerId: string): Promise<boolean>;

    /**
     * Generate signed URL for profile picture.
     * @param partnerId - Partner's ID.
     * @returns Promise resolving to signed URL.
     */
    getProfilePictureUrl(partnerId: string): Promise<string>;

    /**
     * Generate signed URLs for Aadhaar documents.
     * @param partnerId - Partner's ID.
     * @returns Promise resolving to signed URLs for front and back.
     */
    getAadhaarDocumentUrls(partnerId: string): Promise<{ aadharFront?: string; aadharBack?: string }>;

    /**
     * Inject signed URLs into a partner object.
     * @param partner - The partner object.
     */
    injectSignedUrls(partner: IPartner): Promise<IPartner>;

    /**
     * Inject decrypted details into a partner object.
     * @param partner - The partner object.
     */
    injectDecryptedDetails(partner: IPartner): IPartner;

    getAllProperties(pagination?: PaginationOptions, filter?: any): Promise<PaginatedResult<IProperty> | IProperty[]>;
}