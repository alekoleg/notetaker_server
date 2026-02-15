/**
 * YouTube Transcriptor Service
 * 
 * Uses RapidAPI YouTube Transcriptor to fetch video transcripts
 * API: https://rapidapi.com/yashagarwal/api/youtube-transcriptor
 */

const RAPIDAPI_HOST = 'youtube-transcriptor.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!RAPIDAPI_KEY) {
    console.warn('[YouTubeService] RAPIDAPI_KEY is not set - YouTube transcription will not work');
}

/**
 * Extract video ID from YouTube URL
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * 
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if not found
 */
function extractVideoId(url) {
    if (!url) return null;
    
    try {
        url = decodeURIComponent(url);
    } catch (e) {
    }
    
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        return url;
    }

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        /[?&]v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Fetch transcript from YouTube video
 * 
 * @param {Object} options
 * @param {string} options.url - YouTube URL or video ID
 * @param {string} options.lang - Preferred language code (optional, auto-detect if not provided)
 * @returns {Promise<Object>} - { transcript, title, videoId, language }
 */
async function getYouTubeTranscript({ url, lang }) {
    if (!RAPIDAPI_KEY) {
        throw new Error('RAPIDAPI_KEY is not configured');
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        throw new Error(`Invalid YouTube URL or video ID: ${url}`);
    }

    console.log(`[YouTubeService] Fetching transcript for video: ${videoId}${lang ? `, lang: ${lang}` : ' (auto-detect)'}`);

    let apiUrl = `https://${RAPIDAPI_HOST}/transcript?video_id=${videoId}`;
    console.log(`[YouTubeService] API URL: ${apiUrl}`);
    if (lang) {
        apiUrl += `&lang=${lang}`;
    }

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'x-rapidapi-host': RAPIDAPI_HOST,
            'x-rapidapi-key': RAPIDAPI_KEY,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[YouTubeService] API error: ${response.status}`, errorText);
        throw new Error(`YouTube Transcriptor API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No transcript available for this video');
    }

    const result = data[0];

    if (!result || !result.transcriptionAsText) {
        throw new Error('Transcript is empty');
    }

    const transcript = result.transcriptionAsText.trim();

    console.log(`[YouTubeService] Transcript fetched: ${transcript.length} characters`);

    return {
        transcript,
        videoId,
        title: result.title || null,
        language: lang,
        lengthInSeconds: result.lengthInSeconds ? parseInt(result.lengthInSeconds) : null,
        thumbnails: result.thumbnails || [],
    };
}

/**
 * Get video metadata from YouTube (title, duration, etc.)
 * Uses YouTube oEmbed API (no API key required)
 * 
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} - { title, authorName, thumbnailUrl }
 */
async function getVideoMetadata(videoId) {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
            console.warn(`[YouTubeService] Could not fetch video metadata: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        return {
            title: data.title,
            authorName: data.author_name,
            thumbnailUrl: data.thumbnail_url,
        };
    } catch (error) {
        console.warn('[YouTubeService] Error fetching video metadata:', error.message);
        return null;
    }
}

/**
 * Parse YouTube video - get transcript and metadata
 * 
 * @param {Object} options
 * @param {string} options.url - YouTube URL or video ID
 * @param {string} options.lang - Preferred language code (optional, auto-detect if not provided)
 * @returns {Promise<Object>} - { transcript, title, videoId, language, authorName, thumbnailUrl }
 */
async function parseYouTubeVideo({ url, lang }) {
    // Get transcript
    const transcriptResult = await getYouTubeTranscript({ url, lang });
    
    // Get metadata (non-blocking)
    const metadata = await getVideoMetadata(transcriptResult.videoId);
    
    return {
        transcript: transcriptResult.transcript,
        videoId: transcriptResult.videoId,
        language: transcriptResult.language,
        title: transcriptResult.title || metadata?.title || `YouTube Video ${transcriptResult.videoId}`,
        authorName: metadata?.authorName || null,
        thumbnailUrl: transcriptResult.thumbnails?.[0]?.url || metadata?.thumbnailUrl || null,
        lengthInSeconds: transcriptResult.lengthInSeconds,
    };
}

module.exports = {
    extractVideoId,
    getYouTubeTranscript,
    getVideoMetadata,
    parseYouTubeVideo,
};
