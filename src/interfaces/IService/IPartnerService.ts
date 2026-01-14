import { UserRole, OTPType, JWTPayload, PartnerRegistrationData, PaginationOptions, PaginatedResult } from '../../types';
import { IPartner } from '../IModel/IPartner';

/**
 * Service interface for partner-related operations.
 */
export interface IPartnerService {
    /**
     * Register a new partner.
     * @param registrationData - Data for the new partner.
     * @param fileUrls - Map of document type to URL.
     * @returns Promise resolving to the created partner and a success message.
     */
    register(registrationData: PartnerRegistrationData, fileUrls: { [key: string]: string }): Promise<{ partner: IPartner; message: string; accessToken: string; refreshToken: string }>;

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
    getVerificationStatus(partnerId: string): Promise<{ isVerified: boolean; verificationStatus: { personalInformation: boolean; personalDocuments: boolean; vehicalDocuments: boolean; bankingDetails: boolean }; }>;

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
     * Update the status of a partner's document.
     * @param partnerId - The partner's ID.
     * @param documentType - The type of document.
     * @param status - The new status.
     * @param rejectionReason - Optional reason for rejection.
     */
    updateDocumentStatus(partnerId: string, documentType: 'aadhar' | 'pan' | 'license' | 'insurance' | 'pollution' | 'banking', status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Promise<void>;

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
     * Get detailed verification status.
     * @param partnerId - The partner's ID.
     */
    getDetailedVerificationStatus(partnerId: string): Promise<any>; // Using any for brevity since type is complex
}