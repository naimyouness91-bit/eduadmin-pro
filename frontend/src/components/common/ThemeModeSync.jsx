import { useEffect } from 'react';
import { useUIStore } from '../../store';
import {
  THEME_STORAGE_KEY,
  applyThemeMode,
  initThemeMode,
  normalizeThemeMode,
} from '../../utils/applyThemeMode';

/**
 * Global light/dark mode sync (localStorage + <html class="dark">).
 */
export default function ThemeModeSync() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    initThemeMode();
  }, []);

  useEffect(() => {
    applyThemeMode(theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== THEME_STORAGE_KEY || !e.newValue) return;
      const mode = normalizeThemeMode(e.newValue);
      if (useUIStore.getState().theme !== mode) {
        useUIStore.setState({ theme: mode });
        applyThemeMode(mode);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
