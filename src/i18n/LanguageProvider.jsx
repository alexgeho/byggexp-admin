'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import enUS from 'antd/locale/en_US';
import svSE from 'antd/locale/sv_SE';
import nbNO from 'antd/locale/nb_NO';
import { dictionaries } from '@/src/i18n/messages';
import { bindAppTranslator } from '@/src/utils/appMessage';
import { useThemeStore } from '@/src/store/themeStore';

const STORAGE_KEY = 'admin-lang';
const ANTD_LOCALES = { en: enUS, sv: svSE, nb: nbNO };
const SUPPORTED_LANGS = ['en', 'sv', 'nb'];

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (s) => s,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

// Translate by English source string. Unknown strings fall back to the input,
// so the UI stays readable while translation coverage grows.
export function useT() {
  return useLanguage().t;
}

export default function LanguageProvider({ children }) {
  // Swedish-first product: default to 'sv' on a fresh browser (e.g. an invited
  // user's first visit). A stored choice (below) always wins, so existing users
  // and anyone who switched language are unaffected.
  const [lang, setLangState] = useState('sv');
  const themeMode = useThemeStore((state) => state.mode);
  const hydrateTheme = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored && SUPPORTED_LANGS.includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((next) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = useCallback(
    (s) => {
      if (lang === 'en' || s == null) return s;
      return dictionaries[lang]?.[s] ?? s;
    },
    [lang],
  );

  // Localise global toast strings (appMessage) by their English source too.
  useEffect(() => {
    bindAppTranslator(t);
  }, [t]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      <ConfigProvider
        locale={ANTD_LOCALES[lang] || enUS}
        theme={{
          algorithm: themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: { fontFamily: '"Inter", sans-serif' },
        }}
      >
        {children}
      </ConfigProvider>
    </LanguageContext.Provider>
  );
}
