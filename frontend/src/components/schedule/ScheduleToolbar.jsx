import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTableCells,
  faCalendarDay,
  faCalendarDays,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

const VIEWS = [
  { id: 'week', labelKey: 'scheduleUi.viewWeekly', icon: faTableCells },
  { id: 'day', labelKey: 'scheduleUi.viewDaily', icon: faCalendarDay },
  { id: 'month', labelKey: 'scheduleUi.viewMonthly', icon: faCalendarDays },
];

export default function ScheduleToolbar({ view, onViewChange, stats = [], conflictsCount = 0 }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onViewChange(v.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              view === v.id
                ? 'bg-primary-500 text-white shadow-glow scale-[1.02]'
                : 'bg-white/80 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-300'
            }`}
          >
            <FontAwesomeIcon icon={v.icon} className="w-3.5 h-3.5" />
            {t(v.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {conflictsCount > 0 && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-danger-500/10 text-danger-700 dark:text-danger-300 border border-danger-500/20 animate-pulse">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
            {t('scheduleUi.conflictsCount', { count: conflictsCount })}
          </span>
        )}
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="px-4 py-2 rounded-xl bg-white/80 dark:bg-surface-800/80 border border-surface-200/80 dark:border-surface-700/60 text-center min-w-[88px]"
          >
            <p className="text-lg font-display font-bold text-surface-900 dark:text-white">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-surface-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
