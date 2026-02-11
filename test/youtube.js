require('dotenv').config();
const Parse = require('parse/node');

const SERVER_URL = process.env.SERVER_URL;
const APPLICATION_ID = process.env.APPLICATION_ID;
const MASTER_KEY = process.env.MASTER_KEY;

if (!SERVER_URL || !APPLICATION_ID) {
    console.error('❌ Ошибка: SERVER_URL и APPLICATION_ID должны быть установлены в .env');
    process.exit(1);
}

Parse.initialize(APPLICATION_ID);
Parse.serverURL = SERVER_URL;
Parse.masterKey = MASTER_KEY;

async function testParseYouTube() {
    console.log('\n=== Тест parseYouTube Cloud Function ===\n');
    
    const url = process.argv[3] || 'https://www.youtube.com/watch?v=sP9zvr9vGbs';
    const lang = process.argv[4];
    
    const { extractVideoId } = require('../src/services/youtubeService');
    const videoId = extractVideoId(url);
    
    console.log(`Server URL: ${SERVER_URL}`);
    console.log(`YouTube URL: ${url}`);
    console.log(`Извлеченный Video ID: ${videoId || 'не найден'}`);
    if (lang) {
        console.log(`Язык: ${lang}`);
    }
    console.log('');
    
    if (!videoId) {
        console.error('❌ Не удалось извлечь Video ID из URL');
        return;
    }
    
    try {
        const params = { url };
        if (lang) {
            params.lang = lang;
        }
        
        console.log('Вызываю Parse.Cloud.run("parseYouTube", ...)');
        const result = await Parse.Cloud.run('parseYouTube', params, { useMasterKey: true });
        
        console.log('\n✅ Результат:');
        console.log(`  Video ID: ${result.videoId}`);
        console.log(`  Название: ${result.title}`);
        console.log(`  Автор: ${result.authorName || 'не указан'}`);
        console.log(`  Язык: ${result.language || 'авто'}`);
        console.log(`  Thumbnail: ${result.thumbnailUrl || 'нет'}`);
        console.log(`  Транскрипт: ${result.transcript.length} символов`);
        console.log(`\n  Первые 300 символов транскрипта:`);
        console.log(`  "${result.transcript.substring(0, 300)}..."`);
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        if (error.code) {
            console.error(`  Код ошибки: ${error.code}`);
        }
        
        if (error.message.includes('Invalid video id') || error.message.includes('Transcript not available')) {
            console.error('\n💡 Возможные причины:');
            console.error('  - Видео недоступно или удалено');
            console.error('  - У видео нет субтитров');
            console.error('  - Video ID некорректный');
            console.error(`\n  Попробуйте другой URL или проверьте видео: https://www.youtube.com/watch?v=${videoId}`);
        }
        
        if (error.stack) {
            console.error('\n  Stack trace:');
            console.error(error.stack);
        }
    }
}

async function testCreateNoteFromYouTube() {
    console.log('\n=== Тест createNoteFromYouTube Cloud Function ===\n');
    
    const url = process.argv[3] || 'https://www.youtube.com/watch?v=5ftsLKjkUmU&pp=ygUU0LHQvtC70L7RgtC90LjQutC-0LI%3D';
    const title = process.argv[4];
    const lang = process.argv[5];
    
    console.log(`Server URL: ${SERVER_URL}`);
    console.log(`YouTube URL: ${url}`);
    if (title) {
        console.log(`Название: ${title}`);
    }
    if (lang) {
        console.log(`Язык: ${lang}`);
    }
    console.log('');
    
    try {
        const user = await Parse.User.logIn('test', 'test').catch(() => {
            console.log('⚠️  Пользователь test/test не найден. Создаю тестового пользователя...');
            const testUser = new Parse.User();
            testUser.set('username', 'test');
            testUser.set('password', 'test');
            return testUser.signUp();
        });
        
        console.log(`✅ Авторизован как: ${user.get('username')} (${user.id})`);
        
        const params = { url };
        if (title) {
            params.title = title;
        }
        if (lang) {
            params.lang = lang;
        }
        
        console.log('\nВызываю Parse.Cloud.run("createNoteFromYouTube", ...)');
        const result = await Parse.Cloud.run('createNoteFromYouTube', params, {
            sessionToken: user.getSessionToken()
        });
        
        console.log('\n✅ Результат:');
        console.log(`  Note ID: ${result.note.objectId}`);
        console.log(`  Название: ${result.note.title}`);
        console.log(`  Source Type: ${result.note.sourceType}`);
        console.log(`  Source URL: ${result.note.sourceUrl}`);
        console.log(`  Транскрипт: ${result.note.transcript.length} символов`);
        console.log(`  Статус: ${result.note.status}`);
        
        if (result.youtubeMetadata) {
            console.log('\n  YouTube метаданные:');
            console.log(`    Video ID: ${result.youtubeMetadata.videoId}`);
            console.log(`    Автор: ${result.youtubeMetadata.authorName || 'не указан'}`);
            console.log(`    Thumbnail: ${result.youtubeMetadata.thumbnailUrl || 'нет'}`);
        }
        
        console.log(`\n  Первые 200 символов транскрипта:`);
        console.log(`  "${result.note.transcript.substring(0, 200)}..."`);
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        if (error.code) {
            console.error(`  Код ошибки: ${error.code}`);
        }
        if (error.stack) {
            console.error('\n  Stack trace:');
            console.error(error.stack);
        }
    }
}

async function main() {
    const command = process.argv[2];
    
    if (command === 'parse') {
        await testParseYouTube();
    } else if (command === 'create') {
        await testCreateNoteFromYouTube();
    } else {
        console.log('Использование:');
        console.log('  node test/youtube.js parse [url] [lang]     - тест parseYouTube');
        console.log('  node test/youtube.js create [url] [title] [lang] - тест createNoteFromYouTube');
        console.log('\nПримеры:');
        console.log('  node test/youtube.js parse');
        console.log('  node test/youtube.js parse https://youtu.be/dQw4w9WgXcQ');
        console.log('  node test/youtube.js parse https://youtu.be/dQw4w9WgXcQ ru');
        console.log('  node test/youtube.js create');
        console.log('  node test/youtube.js create https://youtu.be/dQw4w9WgXcQ "Мое видео"');
    }
}

main().catch(console.error);
