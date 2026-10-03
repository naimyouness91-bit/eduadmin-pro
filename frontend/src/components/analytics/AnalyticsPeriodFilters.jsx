import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faCalendarWeek, faCalendar, faCalendarDays, faSliders } from '@fortawesome/free-solid-svg-icons';

export default function AnalyticsPeriodFilters({
  preset,
  onPresetChange,
  year,
  monthFrom,
  monthTo,
  onYearChange,
  onMonthFromChange,
  onMonthToChange,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.split('-')[0] ?? 'en';

  const PRESETS = [
    { id: 'today', label: t('analytics.presetToday'), icon: faCalendarDay },
    { id: 'week', label: t('analytics.presetWeek'), icon: faCalendarWeek },
    { id: 'month', label: t('analytics.presetMonth'), icon: faCalendar },
    { id: 'year', label: t('analytics.presetYear'), icon: faCalendarDays },
    { id: 'custom', label: t('analytics.presetCustom'), icon: faSliders },
  ];

  const selectClass =
    'bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:border-primary-500';

  const monthLabel = (i) => new Date(2000, i, 1).toLocaleString(locale, { month: 'short' });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              preset === p.id
                ? 'bg-primary-500 text-white shadow-glow'
                : 'bg-white/80 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-300'
            }`}
          >
            <FontAwesomeIcon icon={p.icon} className="w-3 h-3" />
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 animate-fade-in">
          <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={selectClass}>
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={monthFrom} onChange={(e) => onMonthFromChange(Number(e.target.value))} className={selectClass}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{monthLabel(i)}</option>
            ))}
          </select>
          <span className="text-surface-400 text-sm">{t('analytics.monthTo')}</span>
          <select value={monthTo} onChange={(e) => onMonthToChange(Number(e.target.value))} className={selectClass}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{monthLabel(i)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
