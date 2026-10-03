import { useTranslation } from 'react-i18next';
import { MONTH_LABELS, YEAR_OPTIONS } from '../../config/analyticsCharts';

export default function AnalyticsFilters({ year, monthFrom, monthTo, onYearChange, onMonthFromChange, onMonthToChange }) {
  const { t } = useTranslation();
  const selectClass =
    'bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2.5 text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 min-w-[5.5rem]';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
        <span className="whitespace-nowrap">{t('analytics.filterYear')}</span>
        <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={selectClass}>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
        <span className="whitespace-nowrap">{t('analytics.filterFrom')}</span>
        <select
          value={monthFrom}
          onChange={(e) => onMonthFromChange(Number(e.target.value))}
          className={selectClass}
        >
          {MONTH_LABELS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
        <span className="whitespace-nowrap">{t('analytics.filterTo')}</span>
        <select value={monthTo} onChange={(e) => onMonthToChange(Number(e.target.value))} className={selectClass}>
          {MONTH_LABELS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
