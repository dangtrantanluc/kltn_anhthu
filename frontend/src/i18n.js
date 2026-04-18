import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

const resources = {
    vi,
    en,
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'vi', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
