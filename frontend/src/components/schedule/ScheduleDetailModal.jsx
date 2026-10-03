import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faClock,
  faMapMarkerAlt,
  faChalkboardUser,
  faBook,
} from '@fortawesome/free-solid-svg-icons';
import { Avatar } from '../common/UI';
import {
  formatScheduleTime,
  formatDuration,
  paletteForCourse,
  getTeacherName,
  getRoom,
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

export default function ScheduleDetailModal({ slot, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!slot) return null;

  const dayKey = DAY_KEYS[slot.day_of_week];
  const dayLabel = dayKey ? t(`scheduleUi.days.${dayKey}`) : '';
  const palette = paletteForCourse(slot.course_id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-surface-200/80 dark:border-surface-600/30 bg-white dark:bg-surface-900 shadow-2xl animate-modal-enter overflow-hidden">
        <div className={`h-1.5 ${palette.accent}`} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-500">{dayLabel}</p>
              <h3 className="font-display text-xl font-bold text-surface-900 dark:text-white mt-1">
                {slot.course?.name || t('common.course')}
              </h3>
              <p className="text-sm font-mono text-surface-500 mt-0.5">{slot.course?.code}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800" aria-label={t('common.close')}>
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
            </button>
          </div>

          <div className={`rounded-xl border p-4 space-y-3 mb-4 ${palette.bg} ${palette.border}`}>
            <div className="flex items-center gap-2 text-sm">
              <FontAwesomeIcon icon={faClock} className="w-4 h-4 opacity-70" />
              <span>{formatScheduleTime(slot.start_time)} – {formatScheduleTime(slot.end_time)}</span>
              <span className="text-xs opacity-70">({formatDuration(slot.start_time, slot.end_time)})</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 opacity-70" />
              <span>{getRoom(slot)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FontAwesomeIcon icon={faBook} className="w-4 h-4 opacity-70" />
              <span>{slot.course?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60">
            <Avatar name={getTeacherName(slot)} size="sm" />
            <div>
              <p className="text-xs text-surface-500 flex items-center gap-1">
                <FontAwesomeIcon icon={faChalkboardUser} className="w-3 h-3" />
                {t('scheduleUi.instructor')}
              </p>
              <p className="font-medium text-sm text-surface-900 dark:text-white">{getTeacherName(slot)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
