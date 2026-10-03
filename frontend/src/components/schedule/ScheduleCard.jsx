import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faMapMarkerAlt,
  faChalkboardUser,
  faPenToSquare,
  faTrash,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import {
  formatScheduleTime,
  formatDuration,
  paletteForCourse,
  getTeacherName,
  getRoom,
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

export default function ScheduleCard({
  slot,
  onClick,
  onEdit,
  onDelete,
  compact,
  hasConflict,
  showActions,
  showTeacher = true,
}) {
  const { t } = useTranslation();
  const palette = paletteForCourse(slot.course_id);
  const shortKey = DAY_SHORT_KEYS[slot.day_of_week];
  const dayShort = shortKey ? t(`scheduleUi.daysShort.${shortKey}`) : '';

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? { type: 'button', onClick: () => onClick(slot), className: 'w-full text-left' }
    : { className: 'w-full' };

  return (
    <div
      className={`group relative rounded-xl border p-3 transition-all duration-200 ${palette.bg} ${palette.border} ${palette.text} ${
        hasConflict ? 'ring-2 ring-danger-500/60 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]' : ''
      } ${onClick ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer' : ''} ${compact ? 'p-2 text-[11px]' : 'text-xs'}`}
    >
      {hasConflict && (
        <span className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-danger-500 text-white flex items-center justify-center shadow-sm">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-2.5 h-2.5" />
        </span>
      )}

      <div className={`absolute inset-y-2 start-0 w-1 rounded-full ${palette.accent}`} aria-hidden />

      <Wrapper {...wrapperProps}>
        <div className="ps-2 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold truncate ${compact ? 'text-[11px]' : 'text-sm'}`}>
              {slot.course?.name || t('common.course')}
            </p>
            {!compact && dayShort && (
              <span className="text-[10px] opacity-60 shrink-0">{dayShort}</span>
            )}
          </div>

          {showTeacher && (
            <p className="flex items-center gap-1.5 opacity-85 truncate">
              <FontAwesomeIcon icon={faChalkboardUser} className="w-3 h-3 shrink-0" />
              {getTeacherName(slot)}
            </p>
          )}

          <p className="flex items-center gap-1.5 opacity-90">
            <FontAwesomeIcon icon={faClock} className="w-3 h-3 shrink-0" />
            {formatScheduleTime(slot.start_time)} – {formatScheduleTime(slot.end_time)}
            {!compact && (
              <span className="opacity-70">· {formatDuration(slot.start_time, slot.end_time)}</span>
            )}
          </p>

          <p className="flex items-center gap-1.5 opacity-80 truncate">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3 h-3 shrink-0" />
            {getRoom(slot)}
          </p>
        </div>
      </Wrapper>

      {showActions && (onEdit || onDelete) && (
        <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(slot); }}
              className="p-1.5 rounded-lg bg-white/80 dark:bg-surface-800/90 hover:bg-white dark:hover:bg-surface-700 shadow-sm"
              aria-label={t('common.edit')}
            >
              <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
              className="p-1.5 rounded-lg bg-white/80 dark:bg-surface-800/90 hover:bg-danger-50 dark:hover:bg-danger-900/40 text-danger-600 shadow-sm"
              aria-label={t('common.delete')}
            >
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
