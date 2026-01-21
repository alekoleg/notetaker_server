const { GoogleGenAI } = require("@google/genai");

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

module.exports = { generateImage };

