"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upload_1 = require("../src/middleware/upload");
const testS3 = async () => {
    try {
        const testKey = 'uploads/test.jpg';
        const testUrl = `https://travel-hub-uploads.s3.ap-south-1.amazonaws.com/${testKey}`;
        console.log('Testing signing with key:', testKey);
        const signedUrl1 = await (0, upload_1.getSignedFileUrl)(testKey);
        console.log('Signed URL (from key):', signedUrl1);
        console.log('Testing signing with full URL:', testUrl);
        const signedUrl2 = await (0, upload_1.getSignedFileUrl)(testUrl);
        console.log('Signed URL (from URL):', signedUrl2);
    }
    catch (error) {
        console.error('Error testing S3:', error);
    }
};
testS3();
