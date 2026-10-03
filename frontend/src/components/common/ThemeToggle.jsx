import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store';

/**
 * Sun/Moon theme toggle — shared by dashboard navbar and landing page.
 */
export default function ThemeToggle({ className = '', variant = 'navbar' }) {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  const label = isDark ? t('common.switchThemeLight') : t('common.switchThemeDark');

  if (variant === 'landing') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={[
          'landing-theme-toggle group relative w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden',
          'transition-all duration-300 ease-out',
          'border-surface-200/80 dark:border-surface-700/80',
          'bg-white/70 dark:bg-surface-900/70',
          'hover:border-primary-400/60 dark:hover:border-primary-500/40 hover:shadow-glow',
          'active:scale-95',
          className,
        ].join(' ')}
      >
        <span
          className={`absolute inset-0 bg-gradient-to-br from-primary-500/10 to-primary-600/10 transition-opacity duration-300 ${
            isDark ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden
        />
        <FontAwesomeIcon
          icon={faSun}
          className={`absolute w-4 h-4 text-amber-500 transition-all duration-300 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
        <FontAwesomeIcon
          icon={faMoon}
          className={`absolute w-4 h-4 text-primary-500 dark:text-primary-400 transition-all duration-300 ${
            isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={[
        'relative p-2.5 rounded-xl overflow-hidden',
        'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800',
        'hover:text-surface-900 dark:hover:text-white',
        'transition-all duration-300 ease-out active:scale-95',
        className,
      ].join(' ')}
    >
      <span className="relative block w-4 h-4 shrink-0">
        <FontAwesomeIcon
          icon={faSun}
          className={`absolute inset-0 m-auto w-4 h-4 text-amber-500 transition-all duration-300 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
        <FontAwesomeIcon
          icon={faMoon}
          className={`absolute inset-0 m-auto w-4 h-4 transition-all duration-300 ${
            isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
      </span>
    </button>
  );
}
