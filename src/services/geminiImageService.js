const { GoogleGenAI } = require("@google/genai");
const { normalizeLocale, t } = require('./localizationService');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateImage(prompt) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return Buffer.from(part.inlineData.data, 'base64');
        }
    }
    
    throw new Error('No image in Gemini response');
}

/**
 * Extract text from image using Gemini Vision API (OCR)
 * @param {Object} options - OCR options
 * @param {string} options.imageBase64 - Base64 encoded image
 * @param {string} [options.mimeType='image/jpeg'] - Image MIME type
 * @param {string} [options.language='en'] - Expected language of the text
 * @returns {Promise<Object>} OCR result with extracted text
 */
async function extractTextFromImage({ imageBase64, mimeType = 'image/jpeg', language = 'en' }) {
    console.log('[Gemini] Starting OCR processing...');

    const locale = normalizeLocale(language);
    const prompt = t(locale, 'prompts.ocr');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
                {
                    parts: [
                        {
                            text: prompt,
                        },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageBase64,
                            },
                        },
                    ],
                },
            ],
        });

        const extractedText = response.candidates[0]?.content?.parts[0]?.text || '';
        
        console.log('[Gemini] OCR completed, extracted', extractedText.length, 'characters');

        return {
            text: extractedText.trim(),
            language: locale,
        };
    } catch (error) {
        console.error('[Gemini] OCR error:', error.message);
        throw new Error(`OCR failed: ${error.message}`);
    }
}

/**
 * Extract text from image URL using Gemini Vision API
 * @param {Object} options - OCR options  
 * @param {string} options.imageUrl - URL of the image
 * @param {string} [options.language='en'] - Expected language of the text
 * @returns {Promise<Object>} OCR result with extracted text
 */
async function extractTextFromUrl({ imageUrl, language = 'en' }) {
    console.log('[Gemini] Downloading image from URL:', imageUrl);

    const axios = require('axios');
    
    // Download image
    const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
    });

    const imageBuffer = Buffer.from(response.data);
    const imageBase64 = imageBuffer.toString('base64');
    
    // Detect MIME type from URL or default to jpeg
    let mimeType = 'image/jpeg';
    if (imageUrl.includes('.png')) mimeType = 'image/png';
    else if (imageUrl.includes('.gif')) mimeType = 'image/gif';
    else if (imageUrl.includes('.webp')) mimeType = 'image/webp';

    return extractTextFromImage({
        imageBase64,
        mimeType,
        language,
    });
}

module.exports = { 
    generateImage,
    extractTextFromImage,
    extractTextFromUrl,
};

