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
// https://elevenlabs.io/docs/api-reference/speech-to-text/convert
const STTModels = {
    scribe_v1: 'scribe_v1',
    scribe_v2: 'scribe_v2', // Latest model
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
 * https://elevenlabs.io/docs/api-reference/speech-to-text/convert
 * 
 * @param {Object} options - Transcription options
 * @param {Buffer|string} [options.audio] - Audio buffer or file path
 * @param {string} [options.audioUrl] - HTTPS URL of the audio file (max 2GB, more efficient)
 * @param {string} [options.modelId='scribe_v2'] - Model ID (scribe_v1 or scribe_v2)
 * @param {string} [options.languageCode] - ISO-639 language code (auto-detect if not provided)
 * @param {boolean} [options.diarize=false] - Enable speaker diarization
 * @param {number} [options.numSpeakers] - Max speakers (up to 32)
 * @param {boolean} [options.tagAudioEvents=true] - Tag events like (laughter), (footsteps)
 * @param {string} [options.timestampsGranularity='word'] - 'none', 'word', or 'character'
 * @returns {Promise<Object>} Transcription result
 */
async function transcribeAudio({
    audio,
    audioUrl,
    modelId = STTModels.scribe_v2,
    languageCode = null,
    diarize = false,
    numSpeakers = null,
    tagAudioEvents = true,
    timestampsGranularity = 'word',
}) {
    if (!audio && !audioUrl) {
        throw new Error('Either audio or audioUrl must be provided');
    }

    const formData = new FormData();
    formData.append('model_id', modelId);
    formData.append('tag_audio_events', tagAudioEvents.toString());
    formData.append('timestamps_granularity', timestampsGranularity);

    if (audioUrl) {
        // Use cloud_storage_url - more efficient, no download needed
        console.log('[ElevenLabs] Transcribing from URL:', audioUrl);
        formData.append('cloud_storage_url', audioUrl);
    } else {
        // Use file upload
        console.log('[ElevenLabs] Transcribing from buffer/file...');
        let audioBuffer;
        let filename = 'audio.mp3';

        if (typeof audio === 'string') {
            audioBuffer = fs.readFileSync(audio);
            filename = audio.split('/').pop();
        } else if (Buffer.isBuffer(audio)) {
            audioBuffer = audio;
        } else {
            throw new Error('Audio must be a Buffer or file path');
        }

        formData.append('file', audioBuffer, { filename, contentType: 'audio/mpeg' });
    }

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
                timeout: 600000,
            }
        );

        console.log('[ElevenLabs] Transcription completed');

        return {
            text: response.data.text,
            languageCode: response.data.language_code,
            languageProbability: response.data.language_probability,
            words: response.data.words || [],
        };
    } catch (error) {
        console.error('[ElevenLabs] Transcription error:', error.response?.data || error.message);
        throw new Error(`Transcription failed: ${error.response?.data?.detail || error.message}`);
    }
}

module.exports = {
    generateAudio,
    transcribeAudio,
    ElevenVoices,
    ElevenModels,
    STTModels,
};