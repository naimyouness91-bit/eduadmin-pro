import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import {
  getMonthCalendarDays,
  paletteForCourse,
  formatScheduleTime,
  SCHEDULE_DAYS,
} from '../../utils/scheduleUtils';

const DAY_SHORT_KEYS = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
};

export default function ScheduleMonthlyView({ byDay, onSlotClick }) {
  const { t, i18n } = useTranslation();
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });

  const days = useMemo(() => getMonthCalendarDays(year, month), [year, month]);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

  return (
    <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-white/90 dark:bg-surface-900/80 backdrop-blur-xl shadow-card overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
        <h3 className="font-display font-semibold text-surface-900 dark:text-white">{monthLabel}</h3>
        <div className="flex gap-1">
          <button type="button" onClick={prevMonth} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500">
            <FontAwesomeIcon icon={faChevronLeft} className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={nextMonth} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500">
            <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-surface-100 dark:border-surface-800 text-center text-xs font-semibold text-surface-500">
        {SCHEDULE_DAYS.map((d) => (
          <div key={d.value} className="py-2">{t(`scheduleUi.daysShort.${DAY_SHORT_KEYS[d.value]}`)}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr min-h-[480px]">
        {days.map(({ date, inMonth, isoDay }) => {
          const slots = byDay[isoDay] ?? [];
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[96px] border border-surface-100/80 dark:border-surface-800/80 p-1.5 ${
                !inMonth ? 'bg-surface-50/50 dark:bg-surface-950/30 opacity-50' : ''
              } ${isToday ? 'bg-primary-500/[0.06] ring-1 ring-inset ring-primary-500/20' : ''}`}
            >
              <p className={`text-xs font-medium mb-1 ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-surface-500'}`}>
                {date.getDate()}
              </p>
              <div className="space-y-0.5">
                {slots.slice(0, 3).map((slot) => {
                  const palette = paletteForCourse(slot.course_id);
                  return (
                    <button
                      key={`${date.toISOString()}-${slot.id}`}
                      type="button"
                      onClick={() => onSlotClick?.(slot)}
                      className={`w-full text-left truncate rounded-md px-1 py-0.5 text-[9px] font-medium border ${palette.bg} ${palette.border} ${palette.text} hover:opacity-90`}
                      title={`${slot.course?.name} ${formatScheduleTime(slot.start_time)}`}
                    >
                      {formatScheduleTime(slot.start_time)} {slot.course?.name}
                    </button>
                  );
                })}
                {slots.length > 3 && (
                  <p className="text-[9px] text-surface-400 ps-1">{t('scheduleUi.moreSlots', { count: slots.length - 3 })}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
