import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru/translation.json';
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import fr from './locales/fr/translation.json';

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
  },
  lng: 'en', // язык на старте — переопределяется после входа из профиля аккаунта (см. App.tsx)
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;