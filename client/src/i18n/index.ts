import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ar } from './locales/ar';

export type Lang = 'ar';

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
  },
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: {
    escapeValue: false,
  },
});

export function getLang(): Lang {
  return 'ar';
}

export function applyDocumentLang(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';
  document.title = i18n.t('meta.title');
}

export default i18n;
