import { injectable } from 'tsyringe';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IOCRService, AadharExtractedData } from '../interfaces/IService/IOCRService';
import { logger } from '../utils/logger';
import config from '../config';

@injectable()
export class GeminiOCRService implements IOCRService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        if (!config.gemini.apiKey) {
            logger.warn('⚠️  Gemini API key not configured. Set GEMINI_API_KEY in .env');
        }
        this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    /**
     * Extract Aadhaar data from images using Google Gemini Vision API.
     * Fetches images from S3 and uses AI to extract structured data.
     */
    async extractAadharData(imageUrlFront: string, imageUrlBack: string): Promise<AadharExtractedData> {
        logger.info(`🤖 Starting Gemini AI Aadhaar extraction...`);
        logger.debug(`Front URL: ${imageUrlFront}`);
        logger.debug(`Back URL: ${imageUrlBack}`);

        try {
            // Fetch image from S3 using AWS SDK (works with private buckets)
            const imageBuffer = await this.fetchImageFromS3(imageUrlFront);

            // Convert image to base64
            const base64Image = imageBuffer.toString('base64');
            const mimeType = this.getMimeType(imageUrlFront);

            // Create the prompt for Gemini
            const prompt = this.createExtractionPrompt();

            // Call Gemini Vision API
            logger.info('🔮 Processing image with Gemini Vision API...');
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
            ]);

            const response = await result.response;
            const text = response.text();

            logger.debug(`Gemini Response: ${text}`);

            // Parse the JSON response
            const extractedData = this.parseGeminiResponse(text);

            logger.info(`✅ Gemini extraction successful. Aadhaar ID: XXXX-XXXX-${extractedData.aadharNumber.slice(-4)}`);

            return extractedData;
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error';
            const errorCode = error.code || '';
            logger.error(`❌ Gemini extraction failed: ${errorCode ? errorCode + ' - ' : ''}${errorMessage}`);

            if (error.message?.includes('API key')) {
                throw new Error('Gemini API key is invalid or missing. Please check GEMINI_API_KEY in .env');
            }

            if (error.message?.includes('quota')) {
                throw new Error('Gemini API quota exceeded. Please check your usage limits.');
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
            const urlParts = s3Url.replace('https://', '').split('/');
            const bucketPart = urlParts[0];
            const key = urlParts.slice(1).join('/');

            // Extract bucket name
            let bucketName: string;
            if (bucketPart.includes('.s3.')) {
                bucketName = bucketPart.split('.s3.')[0];
            } else {
                bucketName = config.aws.s3BucketName;
            }

            logger.debug(`Fetching from S3 - Bucket: ${bucketName}, Key: ${key}`);

            // Use AWS SDK to get object
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
            const errorMessage = error.message || 'Unknown error';
            const errorCode = error.name || error.code || 'UNKNOWN';
            logger.error(`Failed to fetch image from S3: ${s3Url} - ${errorCode}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get MIME type from file URL
     */
    private getMimeType(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'webp':
                return 'image/webp';
            default:
                return 'image/jpeg';
        }
    }

    /**
     * Create structured prompt for Gemini
     */
    private createExtractionPrompt(): string {
        return `You are an expert at extracting information from Indian Aadhaar cards.

Analyze this Aadhaar card image and extract the following information in JSON format:

{
  "aadharNumber": "12-digit Aadhaar number (numbers only, no spaces)",
  "fullName": "Full name in UPPERCASE letters",
  "dob": "Date of birth in YYYY-MM-DD format",
  "gender": "Male or Female"
}

IMPORTANT RULES:
1. Extract EXACTLY what you see on the card
2. Aadhaar number must be 12 digits with no spaces or dashes
3. Name should be in UPPERCASE as it appears on the card
4. DOB must be in YYYY-MM-DD format (convert from DD/MM/YYYY if needed)
5. Gender must be exactly "Male" or "Female"
6. If any field is not clearly visible or readable, use "NOT_FOUND"
7. Return ONLY the JSON object, no additional text or explanation

Example output:
{
  "aadharNumber": "123456789012",
  "fullName": "RAJESH KUMAR SHARMA",
  "dob": "1990-05-15",
  "gender": "Male"
}`;
    }

    /**
     * Parse Gemini JSON response
     */
    private parseGeminiResponse(text: string): AadharExtractedData {
        try {
            // Remove markdown code blocks if present
            let jsonText = text.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/g, '');
            }

            // Parse JSON
            const parsed = JSON.parse(jsonText);

            // Validate and normalize
            const aadharNumber = (parsed.aadharNumber || '').replace(/\s/g, '');
            const fullName = (parsed.fullName || 'NOT_FOUND').toUpperCase().trim();
            const dob = parsed.dob || 'NOT_FOUND';
            const gender = parsed.gender || 'NOT_FOUND';

            // Validate Aadhaar number
            const isValidAadhaar = /^\d{12}$/.test(aadharNumber);
            if (!isValidAadhaar && aadharNumber !== 'NOT_FOUND') {
                logger.warn(`⚠️  Invalid Aadhaar number format: ${aadharNumber}`);
            }

            logger.debug(`Parsed - Name: "${fullName}", Aadhaar: ${aadharNumber}, DOB: ${dob}, Gender: ${gender}`);

            return {
                aadharNumber: aadharNumber || 'NOT_FOUND',
                fullName: fullName,
                dob: dob,
                gender: gender,
                isVerified: !!(isValidAadhaar && fullName !== 'NOT_FOUND' && dob !== 'NOT_FOUND' && gender !== 'NOT_FOUND')
            };
        } catch (error: any) {
            logger.error(`Failed to parse Gemini response: ${error.message}`);
            logger.debug(`Raw response: ${text}`);

            // Return default structure if parsing fails
            return {
                aadharNumber: 'NOT_FOUND',
                fullName: 'NOT_FOUND',
                dob: 'NOT_FOUND',
                gender: 'NOT_FOUND',
                isVerified: false
            };
        }
    }
}
