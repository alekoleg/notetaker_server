const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const s3 = new S3Client({
    endpoint: process.env.DIGITAL_SPACE_ENDPOINT,
    region: process.env.DIGITAL_SPACE_REGION,
    credentials: {
        accessKeyId: process.env.DIGITAL_SPACE_ACCESS_KEY_ID,
        secretAccessKey: process.env.DIGITAL_SPACE_SECRET_ACCESS_KEY
    }
});


/**
 * Get public URL for a file path
 */
function getPublicUrl(filePath) {
    const endpoint = process.env.DIGITAL_SPACE_ENDPOINT;
    const bucket = process.env.DIGITAL_SPACE_BUCKET_NAME;
    const endpointHost = endpoint.replace('https://', '').replace('http://', '');
    return `https://${bucket}.${endpointHost}/${filePath}`;
}

/**
 * Generate unique file path in user folder
 * Structure: users/{userId}/{timestamp}_{uniqueId}.{ext}
 */
function generatePath(userId, filename) {
    const ext = filename.split('.').pop() || 'bin';
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    return `users/${userId}/${timestamp}_${uniqueId}.${ext}`;
}

async function isFileExists(finalPath) {
    try {
        await s3.send(new HeadObjectCommand({
            Bucket: process.env.DIGITAL_SPACE_BUCKET_NAME,
            Key: finalPath,
        }));
        return true;
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
        throw err;
    }
}

/**
 * Upload file to S3
 * @param {Buffer} buffer - File data
 * @param {string} userId - User ID
 * @param {string} filename - Original filename (used for extension)
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadFile(buffer, userId, filename) {
    const finalPath = generatePath(userId, filename);
    
    console.log(`[Storage] Uploading: ${finalPath}`);
    
    await s3.send(new PutObjectCommand({
        Bucket: process.env.DIGITAL_SPACE_BUCKET_NAME,
        Key: finalPath,
        Body: buffer,
        ACL: 'public-read',
    }));
    
    const url = getPublicUrl(finalPath);
    console.log(`[Storage] Uploaded: ${url}`);
    
    return { url, path: finalPath };
}

// Aliases for backward compatibility
const uploadAudio = uploadFile;
const uploadImage = uploadFile;

module.exports = {
    uploadFile,
    uploadAudio,
    uploadImage,
    isFileExists,
    getPublicUrl,
}