/**
 * Folder Cloud Functions
 * 
 * Schema:
 * - objectId: String
 * - user: Pointer<User>
 * - name: String
 * - color: String?
 * - order: Number
 * - isDeleted: Boolean
 */

// Validate Folder before save
Parse.Cloud.beforeSave('Folder', async (request) => {
    const folder = request.object;
    const user = request.user;

    // Require user for new folders (skip if master key used and user already set)
    if (folder.isNew() && !user && !request.master && !folder.get('user')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required to create folder');
    }

    // Set defaults on new folders (only if not already set)
    if (folder.isNew() && !folder.get('user')) {
        folder.set('user', user);
    }

    if (folder.isNew()) {
        folder.set('isDeleted', false);
        folder.set('order', folder.get('order') || 0);
    }

    // Require name
    if (!folder.get('name')) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Folder name is required');
    }
});

// Set ACL after save
Parse.Cloud.afterSave('Folder', async (request) => {
    const folder = request.object;
    const user = folder.get('user');

    if (request.context?.isNew && user) {
        const acl = new Parse.ACL(user);
        acl.setPublicReadAccess(false);
        acl.setPublicWriteAccess(false);
        folder.setACL(acl);
        await folder.save(null, { useMasterKey: true });
    }
});

// Get user's folders
Parse.Cloud.define('getFolders', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const query = new Parse.Query('Folder');
    query.equalTo('user', user);
    query.equalTo('isDeleted', false);
    query.ascending('order');

    const folders = await query.find({ useMasterKey: true });
    return folders.map(f => f.toJSON());
});

// Create folder
Parse.Cloud.define('createFolder', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { name, color, order } = request.params;

    if (!name) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'Folder name is required');
    }

    const Folder = Parse.Object.extend('Folder');
    const folder = new Folder();

    folder.set('name', name);
    folder.set('color', color || null);
    folder.set('order', order || 0);
    folder.set('isDeleted', false);
    folder.set('user', user);

    // Set ACL
    const acl = new Parse.ACL(user);
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    folder.setACL(acl);

    await folder.save(null, { useMasterKey: true });
    return folder.toJSON();
});

// Update folder
Parse.Cloud.define('updateFolder', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { folderId, name, color, order } = request.params;

    const query = new Parse.Query('Folder');
    query.equalTo('user', user);
    const folder = await query.get(folderId, { useMasterKey: true });

    if (name !== undefined) folder.set('name', name);
    if (color !== undefined) folder.set('color', color);
    if (order !== undefined) folder.set('order', order);

    await folder.save(null, { useMasterKey: true });
    return folder.toJSON();
});

// Delete folder (soft delete)
Parse.Cloud.define('deleteFolder', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { folderId } = request.params;

    const query = new Parse.Query('Folder');
    query.equalTo('user', user);
    const folder = await query.get(folderId, { useMasterKey: true });

    folder.set('isDeleted', true);
    await folder.save(null, { useMasterKey: true });

    // Unset folder from all notes in this folder
    const notesQuery = new Parse.Query('Note');
    notesQuery.equalTo('folder', folder);
    notesQuery.equalTo('user', user);
    const notes = await notesQuery.find({ useMasterKey: true });

    for (const note of notes) {
        note.unset('folder');
        await note.save(null, { useMasterKey: true });
    }

    return { success: true };
});

// Reorder folders
Parse.Cloud.define('reorderFolders', async (request) => {
    const user = request.user;
    if (!user) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User required');
    }

    const { folderOrders } = request.params; // Array of { folderId, order }

    if (!Array.isArray(folderOrders)) {
        throw new Parse.Error(Parse.Error.INVALID_VALUE, 'folderOrders must be an array');
    }

    for (const { folderId, order } of folderOrders) {
        const query = new Parse.Query('Folder');
        query.equalTo('user', user);
        const folder = await query.get(folderId, { useMasterKey: true });
        folder.set('order', order);
        await folder.save(null, { useMasterKey: true });
    }

    return { success: true };
});
