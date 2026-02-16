import express from 'express';
import { singleUpload, handleUploadError, getSignedFileUrl } from '../middleware/upload';
import { sendSuccess } from '../utils/response';
import { Request, Response } from 'express';

const router = express.Router();

router.post('/', singleUpload, handleUploadError, async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    // Return the Location (S3 URL) or a local path if using local storage
    const file = req.file as any;
    let url = file.location || file.path;

    // If S3 key is present, generate a signed URL for immediate access
    if (file.key) {
        try {
            url = await getSignedFileUrl(file.key);
        } catch (error) {
            console.error('Error signing URL:', error);
            // Fallback to location provided by multer-s3
        }
    }

    sendSuccess(res, 'File uploaded successfully', { url });
});

export default router;
