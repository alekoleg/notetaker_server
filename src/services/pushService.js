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

        console.log(`[Push] Installations for note ${note.id}:`, installations.map(i => ({
            deviceType: i.get('deviceType'),
            badge: i.get('badge'),
            tokenPrefix: (i.get('deviceToken') || '').slice(0, 10) + '...',
        })));

        const locale = normalizeLocale(installations[0].get('localeIdentifier'));
        const title = note.get('title') || '';

        const result = await Parse.Push.send(
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

        console.log(`[Push] Sent note-ready push for note ${note.id} to ${installations.length} installation(s)`, JSON.stringify(result));
    } catch (error) {
        console.error(`[Push] Failed to send note-ready push for note ${note && note.id}:`, error);
    }
}

module.exports = { notifyNoteReady };
