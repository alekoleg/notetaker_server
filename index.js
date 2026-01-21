require('dotenv').config();
const express = require('express');
const { ParseServer } = require('parse-server');
const i18n = require('i18n');

const app = express();

const DB_HOST = process.env.DB_HOST
const SERVER_URL = process.env.SERVER_URL

// Specify the connection string for your mongodb database
// and the location to your Parse cloud code
const server = new ParseServer({
  databaseURI: DB_HOST,
  cloud: __dirname + '/src/main.js', // Provide an absolute path
  appId: process.env.APPLICATION_ID,
  masterKey: process.env.MASTER_KEY, // Keep this key secret!
  // fileKey: null, // Устаревший параметр, удален в Parse Server 7.0
  serverURL: SERVER_URL, // Don't forget to change to https if needed
  publicServerURL: SERVER_URL,
  // Your apps name. This will appear in the subject and body of the emails that are sent.
  appName: 'NoteTaker',
  expireInactiveSessions: false,
  sessionLength: 10 * 360 * 86400, // 10 years
  // Обновленная конфигурация email адаптера
  // emailAdapter: {
  //   module: '@parse/simple-mailgun-adapter',
  //   options: {
  //     // The address that your emails come from
  //     fromAddress: 'noreplay@reading.alekoleg.com',
  //     // Your domain from mailgun.com
  //     domain: "reading.alekoleg.com",
  //     // Your API key from mailgun.com
      // apiKey: process.env.MAILGUN_API_KEY,
  //   }
  // },
  allowClientClassCreation: false, // Рекомендуется для продакшн
  verifyUserEmails: false, // Установите true, если хотите верификацию email
});

i18n.configure({
  locales: ['en', 'ru', 'uk', 'es'],
  directory: __dirname + '/locales',
  defaultLocale: 'en',
});

// Serve the Parse API on the /parse URL prefix
app.use(i18n.init);
// app.set('trust proxy', true)

// Инициализация Parse Server с асинхронным запуском
const startParseServer = async () => {
  try {
    await server.start();
    app.use('/api/parse', server.app);
    
    // server.app.set('trust proxy', true)
    // Middleware должен быть объявлен после инициализации Parse
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/static', express.static(__dirname + '/public/'));

    // Запуск сервера
    app.listen(process.env.SERVER_PORT, () => {
      console.log(`Parse Server running on port ${process.env.SERVER_PORT}`);
    });
  } catch (error) {
    console.error('Error starting Parse Server:', error);
    process.exit(1);
  }
};

// Запускаем процесс инициализации
startParseServer();

