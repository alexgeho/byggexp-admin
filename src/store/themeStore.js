import { create } from 'zustand';

// Light/dark theme, persisted per browser. The actual `data-theme` attribute is
// set on <html> both by an inline boot script (in the root layout, to avoid a
// flash) and here on toggle, so CSS overrides apply immediately; antd switches
// its algorithm via ConfigProvider reading `mode`.
const STORAGE_KEY = 'byggexp.theme';

const applyAttribute = (mode) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);
  }
};

const detectInitial = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create((set, get) => ({
  mode: 'light',
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const mode = detectInitial();
    applyAttribute(mode);
    set({ mode, hydrated: true });
  },

  setMode: (mode) => {
    applyAttribute(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    set({ mode });
  },

  toggle: () => {
    get().setMode(get().mode === 'dark' ? 'light' : 'dark');
  },
}));
