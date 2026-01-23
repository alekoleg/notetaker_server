/**
 * SharedNote Cloud Functions
 * 
 * Schema:
 * - objectId: String
 * - note: Pointer<Note>
 * - shareToken: String (unique)
 * - expiresAt: Date?
 */

const crypto = require('crypto');

// Generate unique share token
function generateShareToken() {
    return crypto.randomBytes(16).toString('hex');
}

// Validate SharedNote before save
Parse.Cloud.beforeSave('SharedNote', async (request) => {
    const sharedNote = request.object;

    // Generate token if not set
    if (sharedNote.isNew() && !sharedNote.get('shareToken')) {
        sharedNote.set('shareToken', generateShareToken());
    }

    // Require note pointer
    if (!sharedNote.get('note')) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Note reference is required');
    }
});

// Create share link for a note
Parse.Cloud.define('createShareLink', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId, expiresInDays } = request.params;

    // Verify user owns the note
    const noteQuery = new Parse.Query('Note');
    noteQuery.equalTo('user', user);
    const note = await noteQuery.get(noteId, { useMasterKey: true });

    if (!note) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Note not found');
    }

    // Check if share link already exists
    const existingQuery = new Parse.Query('SharedNote');
    existingQuery.equalTo('note', note);
    let sharedNote = await existingQuery.first({ useMasterKey: true });

    if (sharedNote) {
        // Update expiration if provided
        if (expiresInDays) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            sharedNote.set('expiresAt', expiresAt);
            await sharedNote.save(null, { useMasterKey: true });
        }
    } else {
        // Create new share link
        const SharedNote = Parse.Object.extend('SharedNote');
        sharedNote = new SharedNote();

        sharedNote.set('note', note);
        sharedNote.set('shareToken', generateShareToken());

        if (expiresInDays) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            sharedNote.set('expiresAt', expiresAt);
        }

        // Public read access for shared notes
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(false);
        if (user) {
            acl.setWriteAccess(user, true);
        }
        sharedNote.setACL(acl);

        await sharedNote.save(null, { useMasterKey: true });
    }

    const baseUrl = process.env.PUBLIC_URL || process.env.SERVER_URL;
    const shareUrl = `${baseUrl}/shared/${sharedNote.get('shareToken')}`;

    return {
        shareToken: sharedNote.get('shareToken'),
        shareUrl,
        expiresAt: sharedNote.get('expiresAt')
    };
});

// Get shared note by token (public, no auth required)
Parse.Cloud.define('getSharedNote', async (request) => {
    const { shareToken } = request.params;

    if (!shareToken) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Share token is required');
    }

    const query = new Parse.Query('SharedNote');
    query.equalTo('shareToken', shareToken);
    query.include('note');

    const sharedNote = await query.first({ useMasterKey: true });

    if (!sharedNote) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Shared note not found');
    }

    // Check expiration
    const expiresAt = sharedNote.get('expiresAt');
    if (expiresAt && new Date() > expiresAt) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Share link has expired');
    }

    const note = sharedNote.get('note');
    if (!note || note.get('isDeleted')) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Note not found or deleted');
    }

    // Return note data (without sensitive fields)
    return {
        objectId: note.id,
        title: note.get('title'),
        sourceType: note.get('sourceType'),
        audioDuration: note.get('audioDuration'),
        transcript: note.get('transcript'),
        aiSummary: note.get('aiSummary'),
        insights: note.get('insights'),
        createdAt: note.get('createdAt'),
        language: note.get('language')
    };
});

// Delete share link
Parse.Cloud.define('deleteShareLink', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId } = request.params;

    // Verify user owns the note
    const noteQuery = new Parse.Query('Note');
    noteQuery.equalTo('user', user);
    const note = await noteQuery.get(noteId, { useMasterKey: true });

    // Find and delete share link
    const query = new Parse.Query('SharedNote');
    query.equalTo('note', note);
    const sharedNote = await query.first({ useMasterKey: true });

    if (sharedNote) {
        await sharedNote.destroy({ useMasterKey: true });
    }

    return { success: true };
});

// Check if note has share link
Parse.Cloud.define('getShareLinkStatus', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId } = request.params;

    // Verify user owns the note
    const noteQuery = new Parse.Query('Note');
    noteQuery.equalTo('user', user);
    const note = await noteQuery.get(noteId, { useMasterKey: true });

    // Find share link
    const query = new Parse.Query('SharedNote');
    query.equalTo('note', note);
    const sharedNote = await query.first({ useMasterKey: true });

    if (!sharedNote) {
        return { hasShareLink: false };
    }

    const baseUrl = process.env.PUBLIC_URL || process.env.SERVER_URL;

    return {
        hasShareLink: true,
        shareToken: sharedNote.get('shareToken'),
        shareUrl: `${baseUrl}/shared/${sharedNote.get('shareToken')}`,
        expiresAt: sharedNote.get('expiresAt')
    };
});
