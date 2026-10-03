export const THEME_STORAGE_KEY = 'theme';

export function normalizeThemeMode(value) {
  return value === 'dark' ? 'dark' : 'light';
}

export function readStoredThemeMode() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  return 'light';
}

/** Apply light/dark class on <html> (Tailwind darkMode: 'class'). */
export function applyThemeMode(theme) {
  const mode = normalizeThemeMode(theme);
  const root = document.documentElement;

  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
  root.setAttribute('data-theme-mode', mode);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eduadmin-theme-mode', { detail: { theme: mode } }));
  }

  return mode;
}

export function persistThemeMode(theme) {
  const mode = normalizeThemeMode(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  return applyThemeMode(mode);
}

export function initThemeMode() {
  return applyThemeMode(readStoredThemeMode());
}
