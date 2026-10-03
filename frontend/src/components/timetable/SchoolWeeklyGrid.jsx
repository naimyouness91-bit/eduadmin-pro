import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPen,
  faTrash,
  faUser,
  faDoorOpen,
  faClock,
  faGraduationCap,
} from '@fortawesome/free-solid-svg-icons';
import {
  SCHOOL_WEEK_DAYS,
  groupSessionsByDay,
  formatTimeRange,
} from '../../utils/timetableConstants';
import { paletteForCourse } from '../../utils/scheduleUtils';

function SessionCard({ session, hasConflict, readOnly, onEdit, onDelete, showClass }) {
  const palette = paletteForCourse(session.course?.id);
  const subject = session.course?.name ?? '—';
  const teacher = session.teacher?.user?.name ?? session.course?.teacher?.user?.name ?? '—';
  const room = session.room || session.course?.room || '—';

  return (
    <div
      className={`relative rounded-xl border-l-4 p-3 shadow-sm transition-shadow hover:shadow-md group ${palette.bg} ${palette.border} ${
        hasConflict ? 'ring-2 ring-danger-500/50' : ''
      }`}
    >
      {!readOnly && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-7 h-7 rounded-lg bg-white/90 dark:bg-surface-800/90 border border-surface-200/80 flex items-center justify-center text-surface-600 hover:text-primary-600"
              aria-label="Edit"
            >
              <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-7 h-7 rounded-lg bg-white/90 dark:bg-surface-800/90 border border-surface-200/80 flex items-center justify-center text-surface-600 hover:text-danger-600"
              aria-label="Delete"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <p className={`text-xs font-mono font-semibold ${palette.text} opacity-90`}>
        <FontAwesomeIcon icon={faClock} className="w-3 h-3 inline mr-1" />
        {formatTimeRange(session.start_time, session.end_time)}
      </p>
      <p className={`text-sm font-bold mt-1.5 pr-12 leading-snug ${palette.text}`}>{subject}</p>
      <div className="mt-2 space-y-1">
        <p className="text-[11px] text-surface-600 dark:text-surface-300 flex items-center gap-1.5 truncate">
          <FontAwesomeIcon icon={faUser} className="w-3 h-3 shrink-0 opacity-60" />
          {teacher}
        </p>
        <p className="text-[11px] text-surface-500 flex items-center gap-1.5 truncate">
          <FontAwesomeIcon icon={faDoorOpen} className="w-3 h-3 shrink-0 opacity-60" />
          {room}
        </p>
        {showClass && session.class_section?.label && (
          <p className="text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-1 truncate">
            <FontAwesomeIcon icon={faGraduationCap} className="w-3 h-3 shrink-0" />
            {session.class_section.label}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SchoolWeeklyGrid({
  sessionsByDay = {},
  days = SCHOOL_WEEK_DAYS,
  loading = false,
  readOnly = false,
  conflictEntryIds = new Set(),
  showClassLabel = false,
  onAddSession,
  onEditSession,
  onDeleteSession,
}) {
  const { t } = useTranslation();

  const week = useMemo(
    () => groupSessionsByDay(sessionsByDay, days),
    [sessionsByDay, days]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {days.map((d) => (
          <div key={d.value} className="rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden">
            <div className="h-10 bg-surface-100 dark:bg-surface-800 animate-pulse" />
            <div className="p-2 space-y-2">
              <div className="h-24 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
              <div className="h-24 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="school-weekly-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 min-h-[320px]">
      {week.map((day) => (
        <div
          key={day.value}
          className="flex flex-col rounded-xl border border-surface-200/80 dark:border-surface-700/60 bg-white dark:bg-surface-900 overflow-hidden shadow-sm"
        >
          <div className="px-3 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white shrink-0">
            <p className="text-sm font-bold">{day.label}</p>
            <p className="text-[10px] opacity-75">
              {day.sessions.length} {t('timetable.session', { count: day.sessions.length, defaultValue: 'session(s)' })}
            </p>
          </div>

          <div className="flex-1 p-2 space-y-2 min-h-[140px]">
            {day.sessions.length === 0 && readOnly && (
              <p className="text-xs text-surface-400 text-center py-6">{t('timetable.noSessionsDay')}</p>
            )}

            {day.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                hasConflict={conflictEntryIds.has(session.id)}
                readOnly={readOnly}
                showClass={showClassLabel}
                onEdit={readOnly ? undefined : () => onEditSession?.(session)}
                onDelete={readOnly ? undefined : () => onDeleteSession?.(session)}
              />
            ))}

            {!readOnly && (
              <button
                type="button"
                onClick={() => onAddSession?.({ day: day.value })}
                className="w-full py-2.5 rounded-lg border-2 border-dashed border-surface-300/80 dark:border-surface-600 hover:border-primary-400 hover:bg-primary-500/5 flex items-center justify-center gap-2 text-xs font-semibold text-surface-500 hover:text-primary-600 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
                {t('timetable.addSession')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
