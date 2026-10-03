import { useTranslation } from 'react-i18next';
import ScheduleCard from './ScheduleCard';
import {
  SCHEDULE_DAYS,
  todayIsoDay,
  buildGridHours,
  gridPosition,
  GRID_SLOT_HEIGHT,
  GRID_HOUR_START,
  GRID_HOUR_END,
} from '../../utils/scheduleUtils';

const DAY_KEYS = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

export default function ScheduleWeeklyGrid({
  byDay,
  loading,
  onSlotClick,
  onEdit,
  onDelete,
  conflictSlotIds,
  showActions,
  showTeacher,
}) {
  const { t } = useTranslation();
  const today = todayIsoDay();
  const hours = buildGridHours();
  const gridHeight = (GRID_HOUR_END - GRID_HOUR_START + 1) * GRID_SLOT_HEIGHT;

  return (
    <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-white/90 dark:bg-surface-900/80 backdrop-blur-xl shadow-card overflow-hidden animate-fade-in">
      <p className="md:hidden px-3 py-2 text-xs text-surface-500 border-b border-surface-100 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-800/40">
        {t('scheduleUi.swipeHint')}
      </p>
      <div className="scroll-hint-x overflow-x-auto overscroll-x-contain">
        <div className="min-w-[720px] sm:min-w-[900px]">
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-surface-200 dark:border-surface-700">
            <div className="py-3 px-2" />
            {SCHEDULE_DAYS.map((day) => (
              <div
                key={day.value}
                className={`py-3 px-2 text-center border-s border-surface-100 dark:border-surface-800 ${
                  day.value === today
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-surface-600 dark:text-surface-400'
                }`}
              >
                <p className="text-sm font-semibold">{t(`scheduleUi.days.${DAY_KEYS[day.value]}`)}</p>
                {day.value === today && (
                  <p className="text-[10px] font-medium text-primary-500 mt-0.5">{t('scheduleUi.today')}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[64px_repeat(7,1fr)]">
            <div className="relative border-e border-surface-100 dark:border-surface-800" style={{ height: gridHeight }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute w-full text-[10px] text-surface-400 pe-2 text-end -translate-y-2"
                  style={{ top: i * GRID_SLOT_HEIGHT + 8 }}
                >
                  {h}
                </div>
              ))}
            </div>

            {SCHEDULE_DAYS.map((day) => (
              <div
                key={day.value}
                className={`relative border-e border-surface-100 dark:border-surface-800 last:border-e-0 ${
                  day.value === today ? 'bg-primary-500/[0.03]' : ''
                }`}
                style={{ height: gridHeight }}
              >
                {hours.map((_, i) => (
                  <div
                    key={`${day.value}-line-${i}`}
                    className="absolute w-full border-t border-surface-100/80 dark:border-surface-800/80"
                    style={{ top: i * GRID_SLOT_HEIGHT }}
                  />
                ))}

                {loading ? (
                  <div className="absolute inset-4 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
                ) : (
                  (byDay[day.value] ?? []).map((slot) => {
                    const { top, height } = gridPosition(slot.start_time, slot.end_time);
                    return (
                      <div
                        key={slot.id}
                        className="absolute inset-x-1 z-10"
                        style={{ top: top + 4, height }}
                      >
                        <ScheduleCard
                          slot={slot}
                          compact
                          onClick={onSlotClick}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          showActions={showActions}
                          showTeacher={showTeacher}
                          hasConflict={conflictSlotIds?.has(slot.id)}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
