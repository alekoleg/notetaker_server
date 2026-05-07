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
const { normalizeLocale, getLocaleFromParams, t } = require('../services/localizationService');


/**
 * Transcribe audio for a note
 * Expects: noteId, language (optional, auto-detect if not provided)
 * Returns: { transcript, languageCode }
 */
Parse.Cloud.define('transcribeAudio', async (request) => {
    const locale = getLocaleFromParams(request.params);
    const { noteId, language } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.noteIdRequired'));
    }

    console.log(`[AI] Starting transcription for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, t(locale, 'errors.noteNotFound'));
    }

    const audioFileUrl = note.get('audioFileUrl');
    if (!audioFileUrl) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.noteHasNoAudioFile'));
    }

    // Update status to processing
    note.set('status', 'processing');
    await note.save(null, { useMasterKey: true });

    try {
        // Transcribe audio
        const result = await transcribeAudio({
            audioUrl: audioFileUrl,
            languageCode: language ? normalizeLocale(language) : null,
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

        throw new Parse.Error(
            Parse.Error.SCRIPT_FAILED,
            t(locale, 'errors.transcriptionFailed', { error: error.message })
        );
    }
});

/**
 * Generate AI summary for a note
 * Expects: noteId, language (optional, locale for generation)
 * Returns: { summary }
 */
Parse.Cloud.define('generateSummary', async (request) => {
    const locale = getLocaleFromParams(request.params);
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, t(locale, 'errors.userRequired'));
    }

    const { noteId } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.noteIdRequired'));
    }

    console.log(`[AI] Generating summary for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, t(locale, 'errors.noteNotFound'));
    }

    const transcript = note.get('transcript');
    if (!transcript) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.noteHasNoTranscript'));
    }

    try {
        // Generate summary using OpenAI
        const systemPrompt = getSummarySystemPrompt(locale);
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
        throw new Parse.Error(
            Parse.Error.SCRIPT_FAILED,
            t(locale, 'errors.summaryGenerationFailed', { error: error.message })
        );
    }
});

/**
 * Generate insight cards for a note
 * Expects: noteId, count (optional, default 5), language (optional, locale for generation)
 * Returns: { insights: string[] }
 */
Parse.Cloud.define('generateInsights', async (request) => {
    const locale = getLocaleFromParams(request.params);
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, t(locale, 'errors.userRequired'));
    }

    const { noteId, count = 5 } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.noteIdRequired'));
    }

    console.log(`[AI] Generating ${count} insights for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, t(locale, 'errors.noteNotFound'));
    }

    const transcript = note.get('transcript');
    if (!transcript) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.noteHasNoTranscript'));
    }

    try {
        // Generate insights using OpenAI
        const systemPrompt = getInsightsSystemPrompt(locale, count);
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
        throw new Parse.Error(
            Parse.Error.SCRIPT_FAILED,
            t(locale, 'errors.insightsGenerationFailed', { error: error.message })
        );
    }
});

/**
 * Process OCR for scanned text image
 * Expects: imageBase64, mimeType (optional), language (optional)
 * Returns: { text }
 */
Parse.Cloud.define('processOCR', async (request) => {
    const locale = getLocaleFromParams(request.params);
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, t(locale, 'errors.userRequired'));
    }

    const { imageBase64, mimeType = 'image/jpeg', language = 'en' } = request.params;
    const ocrLanguage = normalizeLocale(language);

    if (!imageBase64) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.imageBase64Required'));
    }

    console.log(`[AI] Processing OCR, language: ${ocrLanguage}`);

    try {
        const result = await extractTextFromImage({
            imageBase64,
            mimeType,
            language: ocrLanguage,
        });

        console.log(`[AI] OCR completed, extracted ${result.text.length} characters`);

        return {
            text: result.text,
            language: result.language,
        };
    } catch (error) {
        console.error(`[AI] OCR failed:`, error);
        throw new Parse.Error(
            Parse.Error.SCRIPT_FAILED,
            t(locale, 'errors.ocrFailed', { error: error.message })
        );
    }
});

/**
 * Create note from scanned text (OCR + summary + insights)
 * Expects: imageBase64, mimeType (optional), language (optional), title (optional), folderId (optional)
 * Returns: { note }
 */
Parse.Cloud.define('createNoteFromScan', async (request) => {
    const locale = getLocaleFromParams(request.params);
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, t(locale, 'errors.userRequired'));
    }

    const { 
        imageBase64, 
        mimeType = 'image/jpeg', 
        language = 'en',
        title,
        folderId 
    } = request.params;
    const ocrLanguage = normalizeLocale(language);

    if (!imageBase64) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.imageBase64Required'));
    }

    console.log(`[AI] Creating note from scan, language: ${ocrLanguage}`);

    try {
        // Step 1: Extract text via OCR
        const ocrResult = await extractTextFromImage({
            imageBase64,
            mimeType,
            language: ocrLanguage,
        });

        if (!ocrResult.text || ocrResult.text.trim().length === 0) {
            throw new Error(t(locale, 'errors.noTextExtracted'));
        }

        // Step 2: Create note
        const Note = Parse.Object.extend('Note');
        const note = new Note();

        note.set('title', title || t(locale, 'titles.scannedNote'));
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
                await Parse.Cloud.run('generateSummary', { noteId, language: locale }, { sessionToken });
                await Parse.Cloud.run('generateInsights', { noteId, language: locale }, { sessionToken });
            } catch (e) {
                console.error(`[AI] Background processing failed for note ${noteId}:`, e);
            }
        })();

        return { note: note.toJSON() };
    } catch (error) {
        console.error(`[AI] Create note from scan failed:`, error);
        throw new Parse.Error(
            Parse.Error.SCRIPT_FAILED,
            t(locale, 'errors.createNoteFromScanFailed', { error: error.message })
        );
    }
});

/**
 * Process all AI tasks for a note (transcribe + summary + insights)
 * Expects: noteId, language (optional, locale for generation)
 * Returns: { transcript, summary, insights }
 */
Parse.Cloud.define('processNote', async (request) => {
    const locale = getLocaleFromParams(request.params);
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, t(locale, 'errors.userRequired'));
    }

    const { noteId, language } = request.params;
    if (!noteId) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.noteIdRequired'));
    }

    console.log(`[AI] Processing all AI tasks for note: ${noteId}`);

    // Get note
    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, t(locale, 'errors.noteNotFound'));
    }

    const result = {
        transcript: null,
        summary: null,
        insights: null,
    };

    try {
        // Step 1: Transcribe if needed
        if (!note.get('transcript') && note.get('audioFileUrl')) {
            const transcribeResult = await Parse.Cloud.run(
                'transcribeAudio',
                language ? { noteId, language } : { noteId },
                { sessionToken: request.user.getSessionToken() }
            );
            result.transcript = transcribeResult.transcript;
        } else {
            result.transcript = note.get('transcript');
        }

        // Step 2: Generate summary
        if (result.transcript) {
            const summaryResult = await Parse.Cloud.run(
                'generateSummary',
                language ? { noteId, language } : { noteId },
                { sessionToken: request.user.getSessionToken() }
            );
            result.summary = summaryResult.summary;
        }

        // Step 3: Generate insights
        if (result.transcript) {
            const insightsResult = await Parse.Cloud.run(
                'generateInsights',
                language ? { noteId, language } : { noteId },
                { sessionToken: request.user.getSessionToken() }
            );
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
function getSummarySystemPrompt(locale) {
    return t(locale, 'prompts.summary');
}

// Helper: Get system prompt for insights generation
function getInsightsSystemPrompt(locale, count) {
    return t(locale, 'prompts.insights', { count });
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
    const locale = getLocaleFromParams(request.params);
    const { url, lang } = request.params;

    if (!url) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.urlRequired'));
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
        throw new Parse.Error(
            Parse.Error.SCRIPT_FAILED,
            t(locale, 'errors.youtubeParsingFailed', { error: error.message })
        );
    }
});

/**
 * Create note from YouTube video (parse + summary + insights)
 * Expects: url, lang (optional, auto-detect), language (optional, locale), title (optional), folderId (optional)
 * Returns: { note }
 */
Parse.Cloud.define('createNoteFromYouTube', async (request) => {
    const locale = getLocaleFromParams(request.params);
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, t(locale, 'errors.userRequired'));
    }

    const { 
        url, 
        lang,
        language,
        title,
        folderId 
    } = request.params;
    const subtitleLang = lang || language;

    if (!url) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, t(locale, 'errors.urlRequired'));
    }

    console.log(`[AI] Creating note from YouTube: ${url}`);

    try {
        // Step 1: Parse YouTube video
        const youtubeResult = await parseYouTubeVideo({ url, lang: subtitleLang });

        if (!youtubeResult.transcript || youtubeResult.transcript.trim().length === 0) {
            throw new Error(t(locale, 'errors.noTranscriptAvailable'));
        }

        // Step 2: Create note
        const Note = Parse.Object.extend('Note');
        const note = new Note();

        note.set('title', title || youtubeResult.title);
        note.set('sourceType', 'youtube');
        note.set('sourceUrl', `https://www.youtube.com/watch?v=${youtubeResult.videoId}`);
        note.set('transcript', youtubeResult.transcript);
        note.set('status', 'processing');
        note.set('insights', []);
        note.set('isDeleted', false);
        note.set('user', user);

        if (folderId) {
            const folder = Parse.Object.extend('Folder').createWithoutData(folderId);
            note.set('folder', folder);
        }

        const acl = new Parse.ACL(user);
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        note.setACL(acl);

        await note.save(null, { useMasterKey: true });

        console.log(`[AI] Created note from YouTube: ${note.id}`);

        const transcript = youtubeResult.transcript;

        try {
            const summaryPrompt = getSummarySystemPrompt(locale);
            const summary = await createChatResponse(transcript, summaryPrompt, [], false);
            note.set('aiSummary', summary);
            console.log(`[AI] Summary generated for YouTube note: ${note.id}`);
        } catch (e) {
            console.error(`[AI] Summary generation failed for YouTube note ${note.id}:`, e);
        }

        try {
            const insightsPrompt = getInsightsSystemPrompt(locale, 5);
            const insightsResponse = await createChatResponse(transcript, insightsPrompt, [], false);
            const insights = parseInsights(insightsResponse, 5);
            note.set('insights', insights);
            console.log(`[AI] Generated ${insights.length} insights for YouTube note: ${note.id}`);
        } catch (e) {
            console.error(`[AI] Insights generation failed for YouTube note ${note.id}:`, e);
        }

        note.set('status', 'ready');
        await note.save(null, { useMasterKey: true });

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
        throw new Parse.Error(
            Parse.Error.SCRIPT_FAILED,
            t(locale, 'errors.createNoteFromYouTubeFailed', { error: error.message })
        );
    }
});

module.exports = {};
