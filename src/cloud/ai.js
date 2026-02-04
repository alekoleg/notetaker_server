/**
 * AI Cloud Functions
 * 
 * - transcribeAudio: Transcribe audio using ElevenLabs STT
 * - generateSummary: Generate AI summary using OpenAI
 * - generateInsights: Generate insight cards using OpenAI
 * - processOCR: Process image OCR using Gemini Vision
 * - parseYouTube: Parse YouTube video and get transcript
 * - createNoteFromYouTube: Create note from YouTube video
 */

const { transcribeAudio } = require('../services/elevenLabsService');
const { createChatResponse } = require('../services/openAIService');
const { extractTextFromImage } = require('../services/geminiImageService');
const { parseYouTubeVideo } = require('../services/youtubeService');


/**
 * Transcribe audio for a note
 * Expects: noteId, language (optional, auto-detect if not provided)
 * Returns: { transcript, languageCode }
 */
Parse.Cloud.define('transcribeAudio', async (request) => {
    

    const { noteId, language } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'noteId is required');
    }

    console.log(`[AI] Starting transcription for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Note not found');
    }

    const audioFileUrl = note.get('audioFileUrl');
    if (!audioFileUrl) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Note has no audio file');
    }

    // Update status to processing
    note.set('status', 'processing');
    await note.save(null, { useMasterKey: true });

    try {
        // Transcribe audio
        const result = await transcribeAudio({
            audioUrl: audioFileUrl,
        });

        // Update note with transcript
        note.set('transcript', result.text);
        note.set('status', 'ready');
        await note.save(null, { useMasterKey: true });

        console.log(`[AI] Transcription completed for note: ${noteId}`);

        return {
            transcript: result.text,
        };
    } catch (error) {
        console.error(`[AI] Transcription failed for note: ${noteId}`, error);

        // Update status to error
        note.set('status', 'error');
        await note.save(null, { useMasterKey: true });

        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Transcription failed: ${error.message}`);
    }
});

/**
 * Generate AI summary for a note
 * Expects: noteId
 * Returns: { summary }
 */
Parse.Cloud.define('generateSummary', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'noteId is required');
    }

    console.log(`[AI] Generating summary for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Note not found');
    }

    const transcript = note.get('transcript');
    if (!transcript) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Note has no transcript');
    }

    try {
        // Generate summary using OpenAI
        const systemPrompt = getSummarySystemPrompt();
        const summary = await createChatResponse(
            transcript,
            systemPrompt,
            [],
            false // No tools for summary
        );

        // Update note with summary
        note.set('aiSummary', summary);
        await note.save(null, { useMasterKey: true });

        console.log(`[AI] Summary generated for note: ${noteId}`);

        return { summary };
    } catch (error) {
        console.error(`[AI] Summary generation failed for note: ${noteId}`, error);
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Summary generation failed: ${error.message}`);
    }
});

/**
 * Generate insight cards for a note
 * Expects: noteId, count (optional, default 5)
 * Returns: { insights: string[] }
 */
Parse.Cloud.define('generateInsights', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId, count = 5 } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'noteId is required');
    }

    console.log(`[AI] Generating ${count} insights for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Note not found');
    }

    const transcript = note.get('transcript');
    if (!transcript) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Note has no transcript');
    }

    try {
        // Generate insights using OpenAI
        const systemPrompt = getInsightsSystemPrompt(count);
        const response = await createChatResponse(
            transcript,
            systemPrompt,
            [],
            false // No tools for insights
        );

        // Parse insights from response (expecting JSON array or newline-separated)
        const insights = parseInsights(response, count);

        // Update note with insights
        note.set('insights', insights);
        await note.save(null, { useMasterKey: true });

        console.log(`[AI] Generated ${insights.length} insights for note: ${noteId}`);

        return { insights };
    } catch (error) {
        console.error(`[AI] Insights generation failed for note: ${noteId}`, error);
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Insights generation failed: ${error.message}`);
    }
});

/**
 * Process OCR for scanned text image
 * Expects: imageBase64, mimeType (optional), language (optional)
 * Returns: { text }
 */
Parse.Cloud.define('processOCR', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { imageBase64, mimeType = 'image/jpeg', language = 'en' } = request.params;

    if (!imageBase64) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'imageBase64 is required');
    }

    console.log(`[AI] Processing OCR, language: ${language}`);

    try {
        const result = await extractTextFromImage({
            imageBase64,
            mimeType,
            language,
        });

        console.log(`[AI] OCR completed, extracted ${result.text.length} characters`);

        return {
            text: result.text,
            language: result.language,
        };
    } catch (error) {
        console.error(`[AI] OCR failed:`, error);
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `OCR failed: ${error.message}`);
    }
});

/**
 * Create note from scanned text (OCR + summary + insights)
 * Expects: imageBase64, mimeType (optional), language (optional), title (optional), folderId (optional)
 * Returns: { note }
 */
Parse.Cloud.define('createNoteFromScan', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { 
        imageBase64, 
        mimeType = 'image/jpeg', 
        language = 'en',
        title = 'Scanned Note',
        folderId 
    } = request.params;

    if (!imageBase64) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'imageBase64 is required');
    }

    console.log(`[AI] Creating note from scan, language: ${language}`);

    try {
        // Step 1: Extract text via OCR
        const ocrResult = await extractTextFromImage({
            imageBase64,
            mimeType,
            language,
        });

        if (!ocrResult.text || ocrResult.text.trim().length === 0) {
            throw new Error('No text could be extracted from the image');
        }

        // Step 2: Create note
        const Note = Parse.Object.extend('Note');
        const note = new Note();

        note.set('title', title);
        note.set('sourceType', 'scan');
        note.set('transcript', ocrResult.text);
        note.set('status', 'ready');
        note.set('insights', []);
        note.set('isDeleted', false);
        note.set('user', user);

        if (folderId) {
            const folder = Parse.Object.extend('Folder').createWithoutData(folderId);
            note.set('folder', folder);
        }

        // Set ACL
        const acl = new Parse.ACL(user);
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        note.setACL(acl);

        await note.save(null, { useMasterKey: true });

        console.log(`[AI] Created note from scan: ${note.id}`);

        // Step 3: Generate summary and insights in background
        const noteId = note.id;
        const sessionToken = request.user.getSessionToken();
        
        // Run async - don't wait
        (async () => {
            try {
                await Parse.Cloud.run('generateSummary', { noteId }, { sessionToken });
                await Parse.Cloud.run('generateInsights', { noteId }, { sessionToken });
            } catch (e) {
                console.error(`[AI] Background processing failed for note ${noteId}:`, e);
            }
        })();

        return { note: note.toJSON() };
    } catch (error) {
        console.error(`[AI] Create note from scan failed:`, error);
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Failed to create note from scan: ${error.message}`);
    }
});

/**
 * Process all AI tasks for a note (transcribe + summary + insights)
 * Expects: noteId
 * Returns: { transcript, summary, insights }
 */
Parse.Cloud.define('processNote', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'noteId is required');
    }

    console.log(`[AI] Processing all AI tasks for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Note not found');
    }

    const result = {
        transcript: null,
        summary: null,
        insights: null,
    };

    try {
        // Step 1: Transcribe if needed
        if (!note.get('transcript') && note.get('audioFileUrl')) {
            const transcribeResult = await Parse.Cloud.run('transcribeAudio', { noteId }, { sessionToken: request.user.getSessionToken() });
            result.transcript = transcribeResult.transcript;
        } else {
            result.transcript = note.get('transcript');
        }

        // Step 2: Generate summary
        if (result.transcript) {
            const summaryResult = await Parse.Cloud.run('generateSummary', { noteId }, { sessionToken: request.user.getSessionToken() });
            result.summary = summaryResult.summary;
        }

        // Step 3: Generate insights
        if (result.transcript) {
            const insightsResult = await Parse.Cloud.run('generateInsights', { noteId }, { sessionToken: request.user.getSessionToken() });
            result.insights = insightsResult.insights;
        }

        console.log(`[AI] All AI tasks completed for note: ${noteId}`);
        return result;
    } catch (error) {
        console.error(`[AI] Processing failed for note: ${noteId}`, error);
        throw error;
    }
});

// Helper: Get system prompt for summary generation
function getSummarySystemPrompt() {
    return `You are an expert summarizer. Create a clear, concise summary of the following transcript.
Focus on:
- Main topics and key points
- Important insights and takeaways
- Action items or recommendations if any

Format the summary with clear paragraphs. Keep it informative but concise (2-4 paragraphs).`;
}

// Helper: Get system prompt for insights generation
function getInsightsSystemPrompt(count) {
    return `You are an expert at extracting key insights. From the following transcript, extract exactly ${count} most important and memorable quotes or insights.

Requirements:
- Each insight should be a powerful, standalone statement
- Keep each insight concise (1-2 sentences max)
- Make them shareable and impactful
- Return ONLY a JSON array of strings, nothing else

Example format: ["Insight 1", "Insight 2", "Insight 3"]`;
}

// Helper: Parse insights from AI response
function parseInsights(response, expectedCount) {
    try {
        // Try to parse as JSON
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
                return parsed.slice(0, expectedCount).map(s => String(s).trim());
            }
        }
    } catch (e) {
        console.log('[AI] Could not parse insights as JSON, trying line-by-line');
    }

    // Fallback: split by newlines and clean up
    const lines = response
        .split('\n')
        .map(line => line.replace(/^[\d\.\-\*\•]+\s*/, '').trim())
        .filter(line => line.length > 10);

    return lines.slice(0, expectedCount);
}

/**
 * Parse YouTube video and get transcript
 * Expects: url, lang (optional, auto-detect if not provided)
 * Returns: { transcript, title, videoId, language, authorName, thumbnailUrl }
 */
Parse.Cloud.define('parseYouTube', async (request) => {
    const { url, lang } = request.params;

    if (!url) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'url is required');
    }

    console.log(`[AI] Parsing YouTube video: ${url}`);

    try {
        const result = await parseYouTubeVideo({ url, lang });

        console.log(`[AI] YouTube parsed: "${result.title}", ${result.transcript.length} chars`);

        return {
            transcript: result.transcript,
            title: result.title,
            videoId: result.videoId,
            language: result.language,
            authorName: result.authorName,
            thumbnailUrl: result.thumbnailUrl,
        };
    } catch (error) {
        console.error(`[AI] YouTube parsing failed:`, error);
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `YouTube parsing failed: ${error.message}`);
    }
});

/**
 * Create note from YouTube video (parse + summary + insights)
 * Expects: url, lang (optional, auto-detect), title (optional), folderId (optional)
 * Returns: { note }
 */
Parse.Cloud.define('createNoteFromYouTube', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { 
        url, 
        lang,
        title,
        folderId 
    } = request.params;

    if (!url) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'url is required');
    }

    console.log(`[AI] Creating note from YouTube: ${url}`);

    try {
        // Step 1: Parse YouTube video
        const youtubeResult = await parseYouTubeVideo({ url, lang });

        if (!youtubeResult.transcript || youtubeResult.transcript.trim().length === 0) {
            throw new Error('No transcript available for this video');
        }

        // Step 2: Create note
        const Note = Parse.Object.extend('Note');
        const note = new Note();

        note.set('title', title || youtubeResult.title);
        note.set('sourceType', 'youtube');
        note.set('sourceUrl', `https://www.youtube.com/watch?v=${youtubeResult.videoId}`);
        note.set('transcript', youtubeResult.transcript);
        note.set('status', 'ready');
        note.set('insights', []);
        note.set('isDeleted', false);
        note.set('user', user);

        if (folderId) {
            const folder = Parse.Object.extend('Folder').createWithoutData(folderId);
            note.set('folder', folder);
        }

        // Set ACL
        const acl = new Parse.ACL(user);
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        note.setACL(acl);

        await note.save(null, { useMasterKey: true });

        console.log(`[AI] Created note from YouTube: ${note.id}`);

        // Step 3: Generate summary and insights in background
        const noteId = note.id;
        const sessionToken = request.user.getSessionToken();
        
        // Run async - don't wait
        (async () => {
            try {
                await Parse.Cloud.run('generateSummary', { noteId }, { sessionToken });
                await Parse.Cloud.run('generateInsights', { noteId }, { sessionToken });
            } catch (e) {
                console.error(`[AI] Background processing failed for note ${noteId}:`, e);
            }
        })();

        return { 
            note: note.toJSON(),
            youtubeMetadata: {
                videoId: youtubeResult.videoId,
                authorName: youtubeResult.authorName,
                thumbnailUrl: youtubeResult.thumbnailUrl,
            }
        };
    } catch (error) {
        console.error(`[AI] Create note from YouTube failed:`, error);
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Failed to create note from YouTube: ${error.message}`);
    }
});

module.exports = {};
