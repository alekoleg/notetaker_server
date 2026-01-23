/**
 * File Upload Cloud Function
 */

const { uploadFile } = require('../storage/storage');

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Upload file to S3
 * Expects: fileBase64, filename
 * Returns: { url, path }
 */
Parse.Cloud.define('uploadFile', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { fileBase64, filename = 'file.bin' } = request.params;

    if (!fileBase64) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'fileBase64 is required');
    }

    try {
        const buffer = Buffer.from(fileBase64, 'base64');
        
        if (buffer.length > MAX_FILE_SIZE) {
            throw new Error('File too large (max 100MB)');
        }

        console.log(`[Upload] Uploading file for user ${user.id}, size: ${buffer.length} bytes`);
        
        const result = await uploadFile(buffer, user.id, filename);
        return result;
    } catch (error) {
        console.error(`[Upload] Upload failed:`, error);
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Upload failed: ${error.message}`);
    }
});
