const Common = require('../common.js');
const path = require('path');

function getAudioFileName(contentType, date) {
    if (contentType === Common.ContentSchoolRussian) {
        throw new Error('getAudioFileName: ContentSchoolRussian is not supported, please use getAudioLink func cloud');
    }
    return `${Common.generateDateString(date, "-", true)}.mp3`;
}

function getAudioFolderPath(contentType) {
    return `audio/${contentType}`;
}

function getAudioFilePath(contentType, date) {
    const filename = getAudioFileName(contentType, date);
    return `${getAudioFolderPath(contentType)}/${filename}`;
}

function getAudioStreamingFilePath(contentType, date) {
    const folderPath = getAudioStreamingFolderPath(contentType, date);
    return `${folderPath}/prog_index.m3u8`;
}

function getAudioStreamingFolderPath(contentType, date) {
    const folderPath = getAudioFolderPath(contentType);
    const filename = getAudioFileName(contentType, date);
    return `${folderPath}/${filename}_stream`;
}   

function getTopicImagePath(type, date) {
    const folder = 'mainfeed/topic_background/';
    const subDir = type === 'morning' ? 'morning' : 'evening';
    const dateStr = Common.generateDateString(date, "-", true);
    return path.join(folder, subDir, dateStr + '.jpg');
}

function getFeedImageFolderPath() {
    return "meditation/images/";
}

function getStorageUrlWitPath(ruServer = false, filePath) {
    const baseUrl = getStorageBaseS3Url(ruServer);
    return path.join(baseUrl, filePath).replace(':/', '://');
}

function getStorageBaseS3Url(ruServer = false) {
    if (ruServer) {
        const bucketName = process.env.RU_TIMED_SPACE_BUCKET_NAME;
        const endpoint = process.env.RU_TIMED_SPACE_ENDPOINT;
        // endpoint: https://s3.twcstorage.ru/36821932-reading-ru
        const url = endpoint + "/" + bucketName;
        return url;
    } 

    const bucketName = process.env.DIGITAL_SPACE_BUCKET_NAME;
    const endpoint = process.env.DIGITAL_SPACE_ENDPOINT;
    // endpoint: https://fra1.digitaloceanspaces.com -> https://bucket.fra1.digitaloceanspaces.com
    const url = endpoint.replace('https://', `https://${bucketName}.`);
    return url;
}

function updateBaseS3UrlForUrl(url, ruServer = false) {
    if (ruServer) {

        // orignal example https://readingstorage.fra1.digitaloceanspaces.com/meditation/audio/streams/rec_robert_hands/rec_robert_hands_en/prog_index.m3u8
        const bucketName = process.env.RU_TIMED_SPACE_BUCKET_NAME;
        const endpoint = process.env.RU_TIMED_SPACE_ENDPOINT;
        // endpoint: https://s3.twcstorage.ru/36821932-reading-ru
        const baseUrl = endpoint + "/" + bucketName;

        // I have to replace readingstorage.fra1.digitaloceanspaces.com with new Base URL
        return url.replace("https://readingstorage.fra1.digitaloceanspaces.com", baseUrl);
    }

    return url;
}

module.exports = {
    getAudioFileName,
    getAudioFolderPath,
    getAudioFilePath,
    getAudioStreamingFilePath,
    getAudioStreamingFolderPath,
    getTopicImagePath,
    getStorageBaseS3Url,
    getStorageUrlWitPath,
    getFeedImageFolderPath,
    updateBaseS3UrlForUrl,
};