const { normalizeLocale, t } = require('./localizationService');

async function notifyNoteReady(note) {
    try {
        if (!note) {
            return;
        }

        const user = note.get('user');
        if (!user) {
            console.log(`[Push] Note ${note.id} has no user, skip`);
            return;
        }

        const installQuery = new Parse.Query(Parse.Installation);
        installQuery.equalTo('user', user);
        installQuery.exists('deviceToken');

        const installations = await installQuery.find({ useMasterKey: true });
        if (installations.length === 0) {
            console.log(`[Push] No installations for note ${note.id}, skip`);
            return;
        }

        const locale = normalizeLocale(installations[0].get('localeIdentifier'));
        const title = note.get('title') || '';

        await Parse.Push.send(
            {
                where: installQuery,
                data: {
                    alert: {
                        title: t(locale, 'push.noteReady.title'),
                        body: t(locale, 'push.noteReady.body', { title }),
                    },
                    sound: 'default',
                    noteId: note.id,
                    type: 'note_ready',
                },
            },
            { useMasterKey: true }
        );

        console.log(`[Push] Sent note-ready push for note ${note.id} to ${installations.length} installation(s)`);
    } catch (error) {
        console.error(`[Push] Failed to send note-ready push for note ${note && note.id}:`, error);
    }
}

module.exports = { notifyNoteReady };
