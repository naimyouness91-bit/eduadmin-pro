import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { ACTIVE_LANGUAGES, normalizeLanguage } from '../../i18n';

export default function LanguageSwitcher({ className = '', compact = false }) {
  const { i18n, t } = useTranslation();
  const activeCode = normalizeLanguage(i18n.language);
  const current = ACTIVE_LANGUAGES.find((l) => l.code === activeCode) ?? ACTIVE_LANGUAGES[0];

  return (
    <div className={`relative inline-flex ${className}`}>
      <label htmlFor="app-language-select" className="sr-only">
        {t('common.selectLanguage')}
      </label>
      <div className="relative">
        <FontAwesomeIcon
          icon={faGlobe}
          className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 dark:text-surface-300 pointer-events-none"
        />
        <select
          id="app-language-select"
          value={activeCode}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className={[
            'appearance-none rounded-xl border transition-all duration-200',
            'h-10 leading-tight',
            'text-[13px] sm:text-sm font-semibold',
            'border-surface-200/90 dark:border-surface-700/80',
            'bg-white/95 dark:bg-surface-900/80 backdrop-blur-md',
            'text-surface-900 dark:text-surface-100',
            'shadow-sm',
            'hover:border-primary-400/60 hover:bg-white dark:hover:bg-surface-900',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:border-primary-500',
            'ps-9 pe-10',
            // Compact is used in the header — still must show full language names.
            compact ? 'min-w-[8.25rem] sm:min-w-[8.75rem]' : 'min-w-[9rem]',
          ].join(' ')}
          aria-label={t('common.selectLanguage')}
        >
          {ACTIVE_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel}
            </option>
          ))}
        </select>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="absolute end-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-surface-500 dark:text-surface-300 pointer-events-none"
        />
      </div>
      {!compact && (
        <span className="hidden xl:inline ms-2 text-xs text-surface-500 self-center">{current.label}</span>
      )}
    </div>
  );
}
