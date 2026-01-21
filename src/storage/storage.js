const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    endpoint: process.env.DIGITAL_SPACE_ENDPOINT,
    region: process.env.DIGITAL_SPACE_REGION,
    credentials: {
        accessKeyId: process.env.DIGITAL_SPACE_ACCESS_KEY_ID,
        secretAccessKey: process.env.DIGITAL_SPACE_SECRET_ACCESS_KEY
    }
});

function getParams(content, finalPath, ACL_) { 
    return {
        Bucket: process.env.DIGITAL_SPACE_BUCKET_NAME,
        Key: finalPath,
        Body: content,
        ACL: ACL_,
    }
};

async function pushData(content, finalPath, public = false){
    try {
        const ACL_ = public ? 'public-read' : 'private';
        console.log("Pushing data to S3");
        var params = getParams(content, finalPath, ACL_);
        await s3.send(new PutObjectCommand(params));
        console.log('Файл успешно загружен!', finalPath);
    } catch (err) {
        console.error('Ошибка загрузки файла в S3:', err);
        throw err;
    }
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

module.exports = {
    pushData,
    isFileExists,
}