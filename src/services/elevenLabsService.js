const elevenLabs = require('@elevenlabs/elevenlabs-js');
const fs = require('fs');
const { Readable } = require('stream');

const ElevenVoices = {
    liam: "TX3LPaxmHKxFdv7VOQHJ",
    daniel: 'onwK4e9ZLuTAKqWW03F9',
}

const ElevenModels = {
    v2: {
        name: 'eleven_multilingual_v2',
        limit: 10000,
        chunkingStart: 9500, 
    },
    v3: {
        name: 'eleven_v3',
        limit: 3000,
        chunkingStart: 1500, // alpha v3 really bad at handling long text full limit
    },
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set');
}

async function generateAudio({
    voiceId = ElevenVoices.liam,
    text,
    previous_text = null,
    next_text = null,
    modelId = ElevenModels.v3,
    apply_text_normalization = false,
    filePath,
}) {

    const client = new elevenLabs.ElevenLabsClient({
        apiKey: ELEVENLABS_API_KEY,
    });

    if (text.length > modelId.limit) {
        throw new Error(`Text length is greater than model limit: ${text.length} > ${modelId.limit}`);
    }

    const audioStream = await client.textToSpeech.convert(voiceId, {
        text: text,
        modelId: modelId.name,
        voice_settings: {
            stability: 0.95,
            similarity_boost: 0.75,
            style: 0.06,
            use_speaker_boost: true,
            apply_text_normalization: apply_text_normalization,
            previous_text: previous_text,
            next_text: next_text
        }
    });

    await new Promise((resolve, reject) => {
        Readable.fromWeb(audioStream)
            .pipe(fs.createWriteStream(filePath))
            .on('finish', resolve)
            .on('error', reject);
    });
}

module.exports = {
    generateAudio,
    ElevenVoices,
    ElevenModels,
};