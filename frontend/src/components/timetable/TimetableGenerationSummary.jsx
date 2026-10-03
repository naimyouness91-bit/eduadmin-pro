import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie,
  faChalkboardUser,
  faSun,
  faMoon,
  faTriangleExclamation,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { Badge } from '../common/UI';

export default function TimetableGenerationSummary({ summary, onDismiss }) {
  const { t } = useTranslation();

  if (!summary) return null;

  const hasConflicts = (summary.conflicts_count ?? 0) > 0;
  const hasUnplaced = (summary.sessions_unplaced ?? 0) > 0;

  return (
    <div className="w-full max-w-none rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/20 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faChartPie} className="text-primary-500" />
            {t('timetable.generationSummaryTitle')}
          </h3>
          <p className="text-xs text-surface-500 mt-1">{t('timetable.generationSummaryHint')}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 shrink-0"
          >
            {t('common.dismiss', { defaultValue: 'Dismiss' })}
          </button>
        )}
      </div>

      <div className="stat-cards-grid" data-cols="4">
        <StatCard
          label={t('timetable.summarySessions')}
          value={summary.sessions_generated ?? 0}
          sub={t('timetable.summaryRequested', { count: summary.sessions_requested ?? 0 })}
        />
        <StatCard
          label={t('timetable.summaryMorning')}
          value={`${summary.morning_percentage ?? 0}%`}
          icon={faSun}
          sub={t('timetable.summaryMorningCount', { count: summary.morning_sessions ?? 0 })}
        />
        <StatCard
          label={t('timetable.summaryAfternoon')}
          value={`${summary.afternoon_percentage ?? 0}%`}
          icon={faMoon}
          sub={t('timetable.summaryAfternoonCount', { count: summary.afternoon_sessions ?? 0 })}
        />
        <StatCard
          label={t('timetable.summaryConflicts')}
          value={summary.conflicts_count ?? 0}
          icon={faTriangleExclamation}
          highlight={hasConflicts ? 'danger' : 'success'}
        />
      </div>

      {hasUnplaced && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {t('timetable.summaryUnplaced', { count: summary.sessions_unplaced })}
        </p>
      )}

      {summary.teacher_workload?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-2 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faChalkboardUser} className="w-3 h-3" />
            {t('timetable.summaryTeacherWorkload')}
          </h4>
          <div className="scroll-hint-x overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-surface-500 border-b border-surface-200 dark:border-surface-700">
                  <th className="text-left py-1.5 pe-3">{t('timetable.teacher')}</th>
                  <th className="text-center py-1.5 px-2">{t('timetable.sessions')}</th>
                  <th className="text-center py-1.5 px-2">{t('timetable.summaryMorningShort')}</th>
                  <th className="text-center py-1.5 ps-2">{t('timetable.summaryAfternoonShort')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.teacher_workload.map((row) => (
                  <tr key={row.teacher_id} className="border-b border-surface-100 dark:border-surface-800">
                    <td className="py-1.5 pe-3 font-medium text-surface-800 dark:text-surface-200">{row.name}</td>
                    <td className="text-center py-1.5 px-2">{row.sessions}</td>
                    <td className="text-center py-1.5 px-2">{row.morning}</td>
                    <td className="text-center py-1.5 ps-2">{row.afternoon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary.daily_balance?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-2">
            {t('timetable.summaryDailyBalance')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {summary.daily_balance.map((day) => (
              <div
                key={day.day}
                className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-xs"
              >
                <p className="font-semibold text-surface-700 dark:text-surface-300">{day.day_label}</p>
                <p className="text-surface-500 mt-0.5">
                  {t('timetable.summaryDaySplit', { morning: day.morning, afternoon: day.afternoon })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.subject_coverage?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-surface-500 mb-2">
            {t('timetable.summarySubjectCoverage')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {summary.subject_coverage.map((item) => (
              <Badge
                key={item.course_id}
                color={item.complete ? 'success' : 'warning'}
                size="sm"
              >
                <FontAwesomeIcon
                  icon={item.complete ? faCheckCircle : faTriangleExclamation}
                  className="me-1 w-2.5 h-2.5"
                />
                {item.name} ({item.placed}/{item.requested})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasConflicts && summary.conflicts?.length > 0 && (
        <div className="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50/50 dark:bg-danger-950/20 p-3">
          <p className="text-xs font-semibold text-danger-700 dark:text-danger-300 mb-1">
            {t('timetable.conflictsTitle', { count: summary.conflicts_count })}
          </p>
          <ul className="text-xs text-danger-600 dark:text-danger-400 space-y-0.5 list-disc ps-4">
            {summary.conflicts.slice(0, 5).map((c, i) => (
              <li key={c.entry_a_id ?? i}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon, highlight }) {
  const colorClass =
    highlight === 'danger'
      ? 'text-danger-600 dark:text-danger-400'
      : highlight === 'success'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-surface-900 dark:text-white';

  return (
    <div className="w-full min-w-0 h-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-3">
      <p className="text-[10px] uppercase tracking-wide text-surface-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 flex items-center gap-1.5 ${colorClass}`}>
        {icon && <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5 opacity-70" />}
        {value}
      </p>
      {sub && <p className="text-[10px] text-surface-400 mt-0.5">{sub}</p>}
    </div>
  );
}
