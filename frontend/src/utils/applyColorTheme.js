import {
  COLOR_THEME_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  getColorThemeMeta,
  getThemeCssVariables,
  normalizeColorTheme,
} from '../config/colorThemes';

/**
 * Apply brand color theme globally — inline CSS variables on <html> (highest priority).
 */
export function applyColorTheme(themeId) {
  const id = normalizeColorTheme(themeId ?? DEFAULT_COLOR_THEME);
  const root = document.documentElement;
  const vars = getThemeCssVariables(id);

  root.setAttribute('data-color-theme', id);

  Object.entries(vars).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  const meta = getColorThemeMeta(id);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', meta.preview);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eduadmin-color-theme', { detail: { theme: id } }));
  }

  return id;
}

export function persistColorTheme(themeId) {
  const id = normalizeColorTheme(themeId);
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  return applyColorTheme(id);
}

export function initColorTheme() {
  let stored = DEFAULT_COLOR_THEME;
  try {
    stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY) || DEFAULT_COLOR_THEME;
  } catch {
    /* ignore */
  }
  return applyColorTheme(stored);
}
