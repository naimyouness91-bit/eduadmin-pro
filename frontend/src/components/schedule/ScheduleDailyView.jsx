import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import ScheduleCard from './ScheduleCard';
import { SCHEDULE_DAYS, todayIsoDay } from '../../utils/scheduleUtils';

const DAY_KEYS = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

const DAY_SHORT_KEYS = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
};

export default function ScheduleDailyView({
  byDay,
  loading,
  selectedDay,
  onDayChange,
  onSlotClick,
  onEdit,
  onDelete,
  conflictSlotIds,
  showActions,
  showTeacher,
}) {
  const { t } = useTranslation();
  const day = selectedDay ?? todayIsoDay();
  const dayKey = DAY_KEYS[day];
  const dayLabel = dayKey ? t(`scheduleUi.days.${dayKey}`) : '';
  const slots = byDay[day] ?? [];

  const shiftDay = (delta) => {
    let next = day + delta;
    if (next < 1) next = 7;
    if (next > 7) next = 1;
    onDayChange?.(next);
  };

  return (
    <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-white/90 dark:bg-surface-900/80 backdrop-blur-xl shadow-card overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <FontAwesomeIcon icon={faCalendarDay} className="text-primary-500 w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-surface-900 dark:text-white">{dayLabel}</h3>
            <p className="text-xs text-surface-500">{t('scheduleUi.classesScheduled', { count: slots.length })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shiftDay(-1)} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500">
            <FontAwesomeIcon icon={faChevronLeft} className="w-3.5 h-3.5" />
          </button>
          <div className="hidden sm:flex gap-1 px-1">
            {SCHEDULE_DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => onDayChange?.(d.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  d.value === day
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                {t(`scheduleUi.daysShort.${DAY_SHORT_KEYS[d.value]}`)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => shiftDay(1)} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500">
            <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-3 min-h-[320px]">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
          ))
        ) : slots.length ? (
          slots.map((slot) => (
            <ScheduleCard
              key={slot.id}
              slot={slot}
              onClick={onSlotClick}
              onEdit={onEdit}
              onDelete={onDelete}
              showActions={showActions}
              showTeacher={showTeacher}
              hasConflict={conflictSlotIds?.has(slot.id)}
            />
          ))
        ) : (
          <p className="text-sm text-surface-500 text-center py-16">{t('scheduleUi.noClassesToday')}</p>
        )}
      </div>
    </div>
  );
}
