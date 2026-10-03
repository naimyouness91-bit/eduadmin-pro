import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function StudentsSearchBar({
  value,
  onChange,
  onClear,
  searching = false,
  inputRef,
  placeholder,
  className = '',
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('students.searchPlaceholder');

  return (
    <div className={`relative group ${className}`}>
      <FontAwesomeIcon
        icon={searching ? faSpinner : faSearch}
        spin={searching}
        className={`absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
          searching ? 'text-primary-500' : 'text-surface-400 group-focus-within:text-primary-500'
        }`}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl ps-10 pe-10 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute end-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all animate-fade-in"
          aria-label={t('common.clearSearch')}
        >
          <FontAwesomeIcon icon={faTimes} className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
