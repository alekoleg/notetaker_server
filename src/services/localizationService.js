const en = require('../../locales/en.json');
const ru = require('../../locales/ru.json');
const uk = require('../../locales/uk.json');
const es = require('../../locales/es.json');
const pt = require('../../locales/pt.json');

const SUPPORTED_LOCALES = ['en', 'ru', 'uk', 'es', 'pt'];

const LOCALE_ALIASES = {
    ua: 'uk',
    ukr: 'uk',
    eng: 'en',
    rus: 'ru',
    spa: 'es',
    por: 'pt',
    'pt-br': 'pt',
    'pt-pt': 'pt',
    'es-es': 'es',
    'es-mx': 'es',
    'ru-ru': 'ru',
    'uk-ua': 'uk',
    'en-us': 'en',
    'en-gb': 'en',
};

const LOCALES = {
    en,
    ru,
    uk,
    es,
    pt,
};

function normalizeLocale(language) {
    if (!language || typeof language !== 'string') {
        return 'en';
    }

    const normalized = language.trim().toLowerCase();
    if (!normalized) {
        return 'en';
    }

    if (SUPPORTED_LOCALES.includes(normalized)) {
        return normalized;
    }

    if (LOCALE_ALIASES[normalized]) {
        return LOCALE_ALIASES[normalized];
    }

    const baseCode = normalized.split(/[-_]/)[0];

    if (SUPPORTED_LOCALES.includes(baseCode)) {
        return baseCode;
    }

    if (LOCALE_ALIASES[baseCode]) {
        return LOCALE_ALIASES[baseCode];
    }

    return 'en';
}

function getLocaleFromParams(params = {}) {
    return normalizeLocale(params.language || params.lang);
}

function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => {
        if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
            return acc[key];
        }
        return undefined;
    }, obj);
}

function interpolate(template, values = {}) {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            return String(values[key]);
        }
        return `{${key}}`;
    });
}

function t(locale, key, values = {}) {
    const safeLocale = normalizeLocale(locale);
    const localizedTemplate = getByPath(LOCALES[safeLocale], key);
    const fallbackTemplate = getByPath(LOCALES.en, key);
    const template = localizedTemplate || fallbackTemplate;

    if (typeof template !== 'string') {
        return key;
    }

    return interpolate(template, values);
}

module.exports = {
    SUPPORTED_LOCALES,
    normalizeLocale,
    getLocaleFromParams,
    t,
};
