import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';

export const LANG_STORAGE_KEY = 'eduadmin-lang';

/** Set to true to re-enable Arabic UI, RTL layout, and locale files. */
export const ARABIC_ENABLED = false;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'fr', label: 'Français', nativeLabel: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
];

/** Languages exposed in UI selectors (English + French while Arabic is disabled). */
export const ACTIVE_LANGUAGES = ARABIC_ENABLED
  ? SUPPORTED_LANGUAGES
  : SUPPORTED_LANGUAGES.filter((lang) => lang.code !== 'ar');

export function normalizeLanguage(code) {
  const base = (code ?? 'en').split('-')[0];
  if (!ARABIC_ENABLED && base === 'ar') {
    return 'en';
  }
  if (ACTIVE_LANGUAGES.some((lang) => lang.code === base)) {
    return base;
  }
  return 'en';
}

export function getLanguageMeta(code) {
  const normalized = normalizeLanguage(code);
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === normalized) ?? SUPPORTED_LANGUAGES[0];
}

export function applyDocumentLanguage(code) {
  const normalized = normalizeLanguage(code);
  const meta = getLanguageMeta(normalized);
  const dir = ARABIC_ENABLED ? meta.dir : 'ltr';
  const root = document.documentElement;
  root.lang = normalized;
  root.dir = dir;
  root.classList.toggle('rtl', dir === 'rtl');
  root.classList.toggle('ltr', dir === 'ltr');
}

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored) {
      return normalizeLanguage(stored);
    }
    const legacy = localStorage.getItem('i18nextLng');
    if (legacy) {
      return normalizeLanguage(legacy);
    }
  } catch {
    /* ignore */
  }
  return 'en';
}

const initialLng = getInitialLanguage();
applyDocumentLanguage(initialLng);

i18n
  .use(initReactI18next)
  .init({
    lng: initialLng,
    fallbackLng: 'en',
    supportedLngs: ARABIC_ENABLED ? ['en', 'fr', 'ar'] : ['en', 'fr'],
    load: 'languageOnly',
    ns: ['translation'],
    defaultNS: 'translation',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    returnEmptyString: false,
    returnNull: false,
  });

i18n.on('languageChanged', (lng) => {
  const code = normalizeLanguage(lng?.split('-')[0] ?? 'en');
  if (code !== (lng?.split('-')[0] ?? 'en')) {
    i18n.changeLanguage(code);
    return;
  }
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
    localStorage.setItem('i18nextLng', code);
  } catch {
    /* ignore */
  }
  applyDocumentLanguage(code);
});

export default i18n;
