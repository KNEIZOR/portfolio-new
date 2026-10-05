import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/common.json';
import ru from '../locales/ru/common.json';
import hy from '../locales/hy/common.json';

export const supportedLocales = ['en', 'ru', 'hy'] as const;
export type Locale = (typeof supportedLocales)[number];

void i18n.use(initReactI18next).init({
  resources: { en: { common: en }, ru: { common: ru }, hy: { common: hy } },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function isLocale(value: string | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export default i18n;
