export interface AadharExtractedData {
    aadharNumber: string;
    fullName: string;
    dob: string;
    gender: string;
    isVerified?: boolean;
}

export interface IOCRService {
    /**
     * Extracts information from Aadhaar card images.
     * @param imageUrlFront - URL of the front image.
     * @param imageUrlBack - URL of the back image.
     */
    extractAadharData(imageUrlFront: string, imageUrlBack: string): Promise<AadharExtractedData>;
}
