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
} from '@fortawesome/free-solid-svg-icons';
import { TIMETABLE_DAYS, TIMETABLE_PERIODS, cellKey } from '../../utils/timetableConstants';
import { paletteForCourse } from '../../utils/scheduleUtils';

function SessionCard({ cell, hasConflict, onEdit, onDelete }) {
  const palette = paletteForCourse(cell.course?.id);
  const subject = cell.course?.name ?? '—';
  const teacher = cell.teacher?.user?.name ?? cell.course?.teacher?.user?.name ?? '—';
  const room = cell.room || cell.course?.room || '—';

  return (
    <div
      className={`relative h-full min-h-[108px] rounded-xl border-l-4 p-3 shadow-sm transition-shadow hover:shadow-md group ${palette.bg} ${palette.border} ${
        hasConflict ? 'ring-2 ring-danger-500/60' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-7 h-7 rounded-lg bg-white/90 dark:bg-surface-800/90 border border-surface-200/80 dark:border-surface-600 flex items-center justify-center text-surface-600 hover:text-primary-600"
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
              className="w-7 h-7 rounded-lg bg-white/90 dark:bg-surface-800/90 border border-surface-200/80 dark:border-surface-600 flex items-center justify-center text-surface-600 hover:text-danger-600"
              aria-label="Delete"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <p className={`text-sm font-bold leading-snug pr-14 ${palette.text}`}>{subject}</p>
      <div className="mt-2 space-y-1">
        <p className="text-[11px] text-surface-600 dark:text-surface-300 flex items-center gap-1.5 truncate">
          <FontAwesomeIcon icon={faUser} className="w-3 h-3 shrink-0 text-surface-400" />
          <span className="truncate">{teacher}</span>
        </p>
        <p className="text-[11px] text-surface-500 flex items-center gap-1.5 truncate font-mono">
          <FontAwesomeIcon icon={faDoorOpen} className="w-3 h-3 shrink-0 text-surface-400" />
          <span className="truncate">{room}</span>
        </p>
      </div>
      {hasConflict && (
        <span className="inline-block mt-2 text-[10px] font-semibold text-danger-600 dark:text-danger-400">
          Conflict
        </span>
      )}
    </div>
  );
}

function EmptyCell({ onAdd, label }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onAdd?.();
      }}
      className="w-full h-full min-h-[108px] rounded-xl border-2 border-dashed border-surface-300/80 dark:border-surface-600/80 bg-surface-50/50 dark:bg-surface-800/30 hover:border-primary-400 hover:bg-primary-500/5 flex flex-col items-center justify-center gap-2 transition-all group"
    >
      <span className="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20">
        <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-primary-600 dark:text-primary-400" />
      </span>
      <span className="text-xs font-semibold text-surface-500 group-hover:text-primary-600 dark:group-hover:text-primary-400">
        {label}
      </span>
    </button>
  );
}

export default function TimetablePlannerGrid({
  cells = {},
  periods = TIMETABLE_PERIODS,
  days = TIMETABLE_DAYS,
  loading = false,
  conflictKeys = new Set(),
  onAddSession,
  onEditSession,
  onDeleteSession,
  onDragEntryStart,
  onCellDrop,
  dragEntryId = null,
  readOnly = false,
}) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');

  const dayLabels = useMemo(
    () => days.map((d) => ({ ...d, label: isFr ? d.short : d.label })),
    [days, isFr]
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden bg-white dark:bg-surface-900">
        <div className="h-14 bg-gradient-to-r from-primary-500/15 to-violet-500/15 animate-pulse" />
        <div className="p-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="timetable-planner-grid rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden bg-white dark:bg-surface-900 shadow-lg">
      <div className="scroll-hint-x overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              <th className="sticky left-0 z-20 w-32 px-3 py-3 text-left text-xs font-bold uppercase tracking-wider bg-indigo-700 border-r border-white/10">
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 opacity-80" />
                  {t('timetable.period')}
                </span>
              </th>
              {dayLabels.map((day) => (
                <th
                  key={day.value}
                  className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider min-w-[130px] border-l border-white/10"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period, rowIdx) => (
              <tr
                key={period.start}
                className={rowIdx % 2 === 0 ? 'bg-surface-50/60 dark:bg-surface-800/20' : 'bg-white dark:bg-surface-900'}
              >
                <td className="sticky left-0 z-10 px-3 py-2 border-r border-surface-200/80 dark:border-surface-700/60 bg-inherit">
                  <p className="text-xs font-bold text-surface-700 dark:text-surface-200">{period.label}</p>
                </td>
                {dayLabels.map((day) => {
                  const key = cellKey(day.value, period.start);
                  const cell = cells[key];
                  const hasConflict = conflictKeys.has(key);

                  return (
                    <td
                      key={key}
                      className={`p-1.5 align-top border-l border-surface-100 dark:border-surface-800 ${
                        dragEntryId ? 'bg-primary-500/[0.03]' : ''
                      }`}
                      onDragOver={(e) => dragEntryId && e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        onCellDrop?.({ day: day.value, period, key });
                      }}
                    >
                      {cell ? (
                        <div
                          draggable={!readOnly}
                          onDragStart={() => !readOnly && onDragEntryStart?.(cell.id)}
                          className={`h-full ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
                        >
                          <SessionCard
                            cell={cell}
                            hasConflict={hasConflict}
                            onEdit={readOnly ? undefined : () => onEditSession?.({ day: day.value, period, cell, key })}
                            onDelete={readOnly ? undefined : () => onDeleteSession?.({ day: day.value, period, cell, key })}
                          />
                        </div>
                      ) : readOnly ? (
                        <div className="min-h-[108px] rounded-xl bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200/40 dark:border-surface-700/40" />
                      ) : (
                        <EmptyCell
                          onAdd={() => onAddSession?.({ day: day.value, period, cell: null, key })}
                          label={t('timetable.addSession')}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
