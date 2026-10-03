import { useEffect } from 'react';
import { useUIStore } from '../../store';
import { COLOR_THEME_STORAGE_KEY, normalizeColorTheme } from '../../config/colorThemes';
import { applyColorTheme, initColorTheme } from '../../utils/applyColorTheme';

/**
 * Keeps document CSS variables in sync with UI store (global theme provider).
 */
export default function ColorThemeSync() {
  const colorTheme = useUIStore((s) => s.colorTheme);

  useEffect(() => {
    initColorTheme();
  }, []);

  useEffect(() => {
    applyColorTheme(colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== COLOR_THEME_STORAGE_KEY || !e.newValue) return;
      const id = normalizeColorTheme(e.newValue);
      if (useUIStore.getState().colorTheme !== id) {
        useUIStore.setState({ colorTheme: id });
        applyColorTheme(id);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
