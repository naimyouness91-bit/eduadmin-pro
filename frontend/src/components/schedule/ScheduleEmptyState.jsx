import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../common/UI';

export default function ScheduleEmptyState({ onCreate, canCreate }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-dashed border-surface-300 dark:border-surface-600 bg-white/50 dark:bg-surface-900/40 py-20 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
        <FontAwesomeIcon icon={faCalendarPlus} className="w-7 h-7 text-surface-400" />
      </div>
      <h3 className="font-display font-semibold text-lg text-surface-800 dark:text-surface-200">{t('scheduleUi.noSchedules')}</h3>
      <p className="text-sm text-surface-500 max-w-md mx-auto mt-2">
        {t('scheduleUi.noSchedulesHintLong')}
      </p>
      {canCreate && onCreate && (
        <Button icon={faCalendarPlus} onClick={onCreate} className="mt-6">
          {t('scheduleUi.createFirst')}
        </Button>
      )}
    </div>
  );
}

export function ScheduleConflictPanel({ conflicts }) {
  const { t } = useTranslation();
  if (!conflicts.length) return null;

  return (
    <div className="rounded-2xl border border-danger-500/30 bg-danger-500/5 dark:bg-danger-950/20 p-4 space-y-2 animate-fade-in">
      <div className="flex items-center gap-2 text-danger-700 dark:text-danger-300 font-semibold text-sm">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
        {t('scheduleUi.conflictsDetected')}
      </div>
      <ul className="space-y-1.5">
        {conflicts.slice(0, 5).map((c) => (
          <li key={c.id} className="text-xs text-danger-600 dark:text-danger-400 ps-6">
            {c.message}
            {' — '}
            {c.slots.map((s) => s.course?.name).join(' vs ')}
          </li>
        ))}
      </ul>
      {conflicts.length > 5 && (
        <p className="text-xs text-danger-500 ps-6">{t('scheduleUi.moreConflicts', { count: conflicts.length - 5 })}</p>
      )}
    </div>
  );
}
