const elevenLabs = require('@elevenlabs/elevenlabs-js');
const fs = require('fs');
const { Readable } = require('stream');
const axios = require('axios');
const FormData = require('form-data');

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

// Speech-to-Text models
const STTModels = {
    scribe_v1: 'scribe_v1', // High accuracy, supports 99 languages
};

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set');
}

// Create shared client instance
const client = new elevenLabs.ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

async function generateAudio({
    voiceId = ElevenVoices.liam,
    text,
    previous_text = null,
    next_text = null,
    modelId = ElevenModels.v3,
    apply_text_normalization = false,
    filePath,
}) {
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

/**
 * Transcribe audio using ElevenLabs Speech-to-Text API
 * @param {Object} options - Transcription options
 * @param {Buffer|string} options.audio - Audio buffer or file path
 * @param {string} [options.languageCode] - Language code (e.g., 'en', 'ru', 'es', 'uk', 'pt')
 * @param {boolean} [options.diarize=false] - Enable speaker diarization
 * @param {number} [options.numSpeakers] - Number of speakers (for diarization)
 * @returns {Promise<Object>} Transcription result with text and metadata
 */
async function transcribeAudio({
    audio,
    languageCode = null,
    diarize = false,
    numSpeakers = null,
}) {
    console.log('[ElevenLabs] Starting transcription...');

    // Prepare audio data
    let audioBuffer;
    let filename = 'audio.mp3';

    if (typeof audio === 'string') {
        // It's a file path
        audioBuffer = fs.readFileSync(audio);
        filename = audio.split('/').pop();
    } else if (Buffer.isBuffer(audio)) {
        audioBuffer = audio;
    } else {
        throw new Error('Audio must be a Buffer or file path');
    }

    // Create form data
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
        filename: filename,
        contentType: 'audio/mpeg',
    });
    formData.append('model_id', STTModels.scribe_v1);

    if (languageCode) {
        formData.append('language_code', languageCode);
    }

    if (diarize) {
        formData.append('diarize', 'true');
        if (numSpeakers) {
            formData.append('num_speakers', numSpeakers.toString());
        }
    }

    try {
        const response = await axios.post(
            'https://api.elevenlabs.io/v1/speech-to-text',
            formData,
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    ...formData.getHeaders(),
                },
                maxBodyLength: Infinity,
                timeout: 600000, // 10 minutes timeout for long audio
            }
        );

        console.log('[ElevenLabs] Transcription completed');

        return {
            text: response.data.text,
            languageCode: response.data.language_code,
            languageProbability: response.data.language_probability,
            words: response.data.words || [],
            utterances: response.data.utterances || [],
        };
    } catch (error) {
        console.error('[ElevenLabs] Transcription error:', error.response?.data || error.message);
        throw new Error(`Transcription failed: ${error.response?.data?.detail || error.message}`);
    }
}

/**
 * Transcribe audio from URL
 * @param {string} audioUrl - URL to download audio from
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} Transcription result
 */
async function transcribeFromUrl({
    audioUrl,
    languageCode = null,
    diarize = false,
    numSpeakers = null,
}) {
    console.log('[ElevenLabs] Downloading audio from URL:', audioUrl);

    // Download audio
    const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 300000, // 5 minutes timeout for download
    });

    const audioBuffer = Buffer.from(response.data);
    console.log('[ElevenLabs] Audio downloaded, size:', audioBuffer.length);

    return transcribeAudio({
        audio: audioBuffer,
        languageCode,
        diarize,
        numSpeakers,
    });
}

module.exports = {
    generateAudio,
    transcribeAudio,
    transcribeFromUrl,
    ElevenVoices,
    ElevenModels,
    STTModels,
};