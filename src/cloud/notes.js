/**
 * Note Cloud Functions
 * 
 * Schema:
 * - objectId: String
 * - user: Pointer<User>
 * - title: String
 * - folder: Pointer<Folder>?
 * - sourceType: String (recording|youtube|upload|scan)
 * - sourceUrl: String? (для YouTube)
 * - audioFileUrl: String?
 * - transcript: String?
 * - aiSummary: String?
 * - myNotes: String?
 * - insights: Array<String>
 * - status: String (processing|ready|error)
 * - isDeleted: Boolean
 */

const SOURCE_TYPES = ['recording', 'youtube', 'upload', 'scan'];
const STATUSES = ['processing', 'ready', 'error'];

// Validate Note before save
Parse.Cloud.beforeSave('Note', async (request) => {
    const note = request.object;
    const user = request.user;

    // Require user for new notes (skip if master key used and user already set)
    if (note.isNew() && !user && !request.master && !note.get('user')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required to create note');
    }

    // Set user on new notes (only if not already set)
    if (note.isNew() && !note.get('user')) {
        note.set('user', user);
    }

    if (note.isNew()) {
        note.set('isDeleted', false);
        note.set('status', note.get('status') || 'processing');
        note.set('insights', note.get('insights') || []);
    }

    // Validate sourceType
    const sourceType = note.get('sourceType');
    if (sourceType && !SOURCE_TYPES.includes(sourceType)) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, `Invalid sourceType: ${sourceType}`);
    }

    // Validate status
    const status = note.get('status');
    if (status && !STATUSES.includes(status)) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, `Invalid status: ${status}`);
    }

    // Require title
    if (!note.get('title')) {
        note.set('title', 'Untitled Note');
    }
});

// Set ACL after save
Parse.Cloud.afterSave('Note', async (request) => {
    const note = request.object;
    const user = note.get('user');

    // Set ACL for new notes (user can read/write, no public access)
    if (request.context?.isNew && user) {
        const acl = new Parse.ACL(user);
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        note.setACL(acl);
        await note.save(null, { useMasterKey: true });
    }
});

// Before delete - just mark as deleted (soft delete)
Parse.Cloud.beforeDelete('Note', async (request) => {
    // Allow master key to actually delete
    if (request.master) return;

    // Otherwise, soft delete
    const note = request.object;
    note.set('isDeleted', true);
    await note.save(null, { useMasterKey: true });
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Notes are soft deleted');
});

// Get user's notes
Parse.Cloud.define('getNotes', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { folderId, limit = 50, skip = 0 } = request.params;

    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    query.equalTo('isDeleted', false);
    query.descending('createdAt');
    query.limit(limit);
    query.skip(skip);

    if (folderId) {
        const folder = Parse.Object.extend('Folder').createWithoutData(folderId);
        query.equalTo('folder', folder);
    }

    const notes = await query.find({ useMasterKey: true });
    return notes.map(n => n.toJSON());
});

// Create note
Parse.Cloud.define('createNote', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { title, sourceType, sourceUrl, audioFileUrl, folderId } = request.params;

    const Note = Parse.Object.extend('Note');
    const note = new Note();

    note.set('title', title || 'Untitled Note');
    note.set('sourceType', sourceType);
    note.set('sourceUrl', sourceUrl);
    note.set('audioFileUrl', audioFileUrl);
    note.set('status', 'processing');
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
    return note.toJSON();
});

// Update note
Parse.Cloud.define('updateNote', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId, title, myNotes, folderId } = request.params;

    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    if (title !== undefined) note.set('title', title);
    if (myNotes !== undefined) note.set('myNotes', myNotes);
    if (folderId !== undefined) {
        if (folderId) {
            const folder = Parse.Object.extend('Folder').createWithoutData(folderId);
            note.set('folder', folder);
        } else {
            note.unset('folder');
        }
    }

    await note.save(null, { useMasterKey: true });
    return note.toJSON();
});

// Delete note (soft delete)
Parse.Cloud.define('deleteNote', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { noteId } = request.params;

    const query = new Parse.Query('Note');
    query.equalTo('user', user);
    const note = await query.get(noteId, { useMasterKey: true });

    note.set('isDeleted', true);
    await note.save(null, { useMasterKey: true });

    return { success: true };
});

module.exports = {
    SOURCE_TYPES,
    STATUSES,
};
