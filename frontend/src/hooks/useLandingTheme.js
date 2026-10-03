import { useUIStore } from '../store';

const STORAGE_KEY = 'theme';

/**
 * Landing page theme hook — same store/localStorage as dashboard navbar.
 */
export function useLandingTheme() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setTheme = useUIStore((s) => s.setTheme);

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggle: toggleTheme,
  };
}

export function getStoredLandingTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  return null;
}
