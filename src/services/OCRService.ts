import { injectable } from 'tsyringe';
import { createWorker } from 'tesseract.js';
import { IOCRService, AadharExtractedData } from '../interfaces/IService/IOCRService';
import { logger } from '../utils/logger';
import config from '../config';

@injectable()
export class OCRService implements IOCRService {
    /**
     * Extract Aadhaar data from images using Tesseract.js OCR.
     * Fetches images from S3 using AWS SDK (works with private buckets).
     */
    async extractAadharData(imageUrlFront: string, imageUrlBack: string): Promise<AadharExtractedData> {
        logger.info(`🔍 Starting Aadhaar OCR extraction...`);
        logger.debug(`Front URL: ${imageUrlFront}`);
        logger.debug(`Back URL: ${imageUrlBack}`);

        try {
            // Fetch image from S3 using AWS SDK (works with private buckets)
            const imageBuffer = await this.fetchImageFromS3(imageUrlFront);

            // Initialize Tesseract worker
            const worker = await createWorker('eng');

            try {
                // Perform OCR
                logger.info('📄 Processing image with Tesseract OCR...');
                const { data: { text } } = await worker.recognize(imageBuffer);

                logger.debug(`Raw OCR Text:\n${text}`);

                // Extract Aadhaar details using regex patterns
                const extractedData = this.parseAadharText(text);

                logger.info(`✅ OCR extraction successful. Aadhaar ID: XXXX-XXXX-${extractedData.aadharNumber.slice(-4)}`);

                return extractedData;
            } finally {
                // Always terminate worker to free resources
                await worker.terminate();
            }
        } catch (error: any) {
            // Avoid logging circular references from axios/network errors
            const errorMessage = error.message || 'Unknown error';
            const errorCode = error.code || '';
            logger.error(`❌ OCR extraction failed: ${errorCode ? errorCode + ' - ' : ''}${errorMessage}`);

            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new Error('Failed to fetch image from S3. Please check network connection.');
            }

            if (error.message?.includes('recognize')) {
                throw new Error('OCR processing failed. Please ensure image is clear and readable.');
            }

            throw new Error(`Aadhaar extraction failed: ${errorMessage}`);
        }
    }

    /**
     * Fetch image from S3 using AWS SDK (works with private buckets)
     */
    private async fetchImageFromS3(s3Url: string): Promise<Buffer> {
        try {
            // Extract bucket and key from S3 URL
            // Format: https://bucket-name.s3.region.amazonaws.com/path/to/file
            // or: https://s3.region.amazonaws.com/bucket-name/path/to/file
            const urlParts = s3Url.replace('https://', '').split('/');
            const bucketPart = urlParts[0];
            const key = urlParts.slice(1).join('/');

            // Extract bucket name (handle both URL formats)
            let bucketName: string;
            if (bucketPart.includes('.s3.')) {
                bucketName = bucketPart.split('.s3.')[0];
            } else {
                bucketName = config.aws.s3BucketName;
            }

            logger.debug(`Fetching from S3 - Bucket: ${bucketName}, Key: ${key}`);

            // Use AWS SDK to get object (uses IAM credentials, works with private buckets)
            const { GetObjectCommand } = await import('@aws-sdk/client-s3');
            const { S3Client } = await import('@aws-sdk/client-s3');

            const s3Client = new S3Client({
                region: config.aws.region,
                credentials: {
                    accessKeyId: config.aws.accessKeyId,
                    secretAccessKey: config.aws.secretAccessKey,
                },
            });

            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const response = await s3Client.send(command);

            // Convert stream to buffer
            const chunks: Uint8Array[] = [];
            for await (const chunk of response.Body as any) {
                chunks.push(chunk);
            }

            const buffer = Buffer.concat(chunks);
            logger.debug(`Successfully fetched ${buffer.length} bytes from S3`);

            return buffer;
        } catch (error: any) {
            // Avoid logging circular references from AWS SDK errors
            const errorMessage = error.message || 'Unknown error';
            const errorCode = error.name || error.code || 'UNKNOWN';
            logger.error(`Failed to fetch image from S3: ${s3Url} - ${errorCode}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Parse OCR text and extract Aadhaar details using regex patterns
     */
    private parseAadharText(text: string): AadharExtractedData {
        // Clean up text
        const cleanText = text.replace(/\r\n/g, '\n').trim();

        // Extract Aadhaar Number (12 digits, may have spaces)
        const aadhaarPattern = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
        const aadhaarMatch = cleanText.match(aadhaarPattern);
        const aadharNumber = aadhaarMatch ? aadhaarMatch[0].replace(/\s/g, '') : '';

        // Extract DOB (DD/MM/YYYY or DD-MM-YYYY)
        const dobPattern = /(?:DOB|Date of Birth|Birth)[\s:]*(\d{2}[/-]\d{2}[/-]\d{4})/i;
        const dobMatch = cleanText.match(dobPattern);
        let dob = dobMatch ? dobMatch[1] : '';

        // Convert to YYYY-MM-DD format if found
        if (dob && dob.includes('/')) {
            const [day, month, year] = dob.split('/');
            dob = `${year}-${month}-${day}`;
        } else if (dob && dob.includes('-')) {
            const parts = dob.split('-');
            if (parts[0].length === 2) { // DD-MM-YYYY format
                const [day, month, year] = parts;
                dob = `${year}-${month}-${day}`;
            }
        }

        // Extract Gender
        const genderPattern = /\b(Male|Female|MALE|FEMALE|M|F)\b/i;
        const genderMatch = cleanText.match(genderPattern);
        let gender = genderMatch ? genderMatch[1] : '';

        // Normalize gender
        if (gender.toUpperCase() === 'M') gender = 'Male';
        if (gender.toUpperCase() === 'F') gender = 'Female';
        if (gender) {
            gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
        }

        // Extract Full Name (typically in all caps, before DOB/Aadhaar number)
        // Look for lines with all caps text (name is usually in caps on Aadhaar)
        const lines = cleanText.split('\n');
        let fullName = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            // Look for all-caps lines that are likely names (2-4 words, letters only)
            if (/^[A-Z\s]{3,50}$/.test(trimmedLine) &&
                trimmedLine.split(/\s+/).length >= 2 &&
                trimmedLine.split(/\s+/).length <= 4 &&
                !trimmedLine.includes('GOVERNMENT') &&
                !trimmedLine.includes('INDIA') &&
                !trimmedLine.includes('AADHAAR')) {
                fullName = trimmedLine;
                break;
            }
        }

        // If no name found with strict pattern, try to find name near "Name:" label
        if (!fullName) {
            const namePattern1 = /(?:Name|NAME)[\s:]+([A-Z][A-Za-z\s]{2,50})/;
            const nameMatch1 = cleanText.match(namePattern1);
            if (nameMatch1) {
                fullName = nameMatch1[1].trim().toUpperCase();
            }
        }

        // Approach 3: First few lines with capitalized words
        if (!fullName) {
            for (let i = 0; i < Math.min(3, lines.length); i++) {
                const line = lines[i].trim();
                const words = line.split(/\s+/);
                if (words.length >= 2 && words.length <= 4) {
                    const allCaps = words.every(w => /^[A-Z]+$/.test(w) && w.length > 1);
                    if (allCaps) {
                        fullName = line;
                        break;
                    }
                }
            }
        }

        logger.debug(`Extracted - Name: ${fullName}, Aadhaar: ${aadharNumber}, DOB: ${dob}, Gender: ${gender}`);

        // Validate we got at least Aadhaar number
        if (!aadharNumber || aadharNumber.length !== 12) {
            logger.warn('⚠️  Could not extract valid Aadhaar number from OCR text');
        }

        return {
            aadharNumber: aadharNumber || 'NOT_FOUND',
            fullName: fullName || 'NOT_FOUND',
            dob: dob || 'NOT_FOUND',
            gender: gender || 'NOT_FOUND',
            isVerified: !!(aadharNumber && fullName && dob && gender)
        };
    }
}
