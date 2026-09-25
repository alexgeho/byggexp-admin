// Languages a person can be assigned (invited users, invited company admins).
// Drives their invitation/login emails and the app/admin default language until
// they change it themselves. Codes match the mobile app's locales (Norwegian =
// "no"; the backend maps it to "nb" for mail). Labels in Swedish so admins
// recognise them.
export const LANGUAGE_OPTIONS = [
  { value: 'sv', label: 'Svenska' },
  { value: 'en', label: 'Engelska' },
  { value: 'pl', label: 'Polska' },
  { value: 'et', label: 'Estniska' },
  { value: 'fi', label: 'Finska' },
  { value: 'lv', label: 'Lettiska' },
  { value: 'lt', label: 'Litauiska' },
  { value: 'no', label: 'Norska' },
  { value: 'ru', label: 'Ryska' },
  { value: 'bs', label: 'Bosniska / Kroatiska / Serbiska' },
  { value: 'uk', label: 'Ukrainska' },
  { value: 'es', label: 'Spanska' },
  { value: 'pt', label: 'Portugisiska' },
  { value: 'fr', label: 'Franska' },
];
export const DEFAULT_USER_LANGUAGE = 'sv';

// Backend stores language as a { code: displayName } object (legacy shape).
export const toLanguageObject = (code) => {
  const opt = LANGUAGE_OPTIONS.find((o) => o.value === code);
  return { [code]: opt ? opt.label : code };
};
export const languageCodeOf = (language) =>
  language && typeof language === 'object'
    ? Object.keys(language)[0] || DEFAULT_USER_LANGUAGE
    : language || DEFAULT_USER_LANGUAGE;

// Admin UI language for a person's language code ("no" → "nb"); null when the
// admin has no translation for it.
const ADMIN_LANGS = ['en', 'sv', 'nb', 'pl', 'uk', 'ru', 'fi', 'et', 'lt', 'lv', 'bs'];
export const adminLangFor = (code) => {
  const c = code === 'no' || code === 'nn' ? 'nb' : code;
  return ADMIN_LANGS.includes(c) ? c : null;
};

// Home market implied by the admin's language (only markets we support).
export const countryForLanguage = (code) => (code === 'no' ? 'NO' : 'SE');
