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
  faStickyNote,
} from '@fortawesome/free-solid-svg-icons';
import {
  TIMETABLE_DAYS,
  TIMETABLE_PERIODS,
  cellKey,
  dayLabel,
} from '../../utils/timetableConstants';
import { paletteForCourse } from '../../utils/scheduleUtils';

function SessionCell({ cell, hasConflict, readOnly, showClass, onEdit, onDelete }) {
  const palette = paletteForCourse(cell.course?.id);
  const subject = cell.course?.name ?? '—';
  const teacher = cell.teacher?.user?.name ?? cell.course?.teacher?.user?.name ?? '—';
  const room = cell.room || cell.course?.room || '—';

  return (
    <div
      className={`relative h-full min-h-[96px] rounded-lg border-l-[3px] p-2.5 shadow-sm transition-all hover:shadow-md group ${palette.bg} ${palette.border} ${
        hasConflict ? 'ring-2 ring-danger-500/60 bg-danger-500/5' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {!readOnly && (onEdit || onDelete) && (
        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-6 h-6 rounded-md bg-white/95 dark:bg-surface-800/95 border border-surface-200/80 flex items-center justify-center text-surface-600 hover:text-primary-600"
              aria-label="Edit"
            >
              <FontAwesomeIcon icon={faPen} className="w-2.5 h-2.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-6 h-6 rounded-md bg-white/95 dark:bg-surface-800/95 border border-surface-200/80 flex items-center justify-center text-surface-600 hover:text-danger-600"
              aria-label="Delete"
            >
              <FontAwesomeIcon icon={faTrash} className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      <p className={`text-xs font-bold leading-tight pr-10 line-clamp-2 ${palette.text}`}>{subject}</p>
      <div className="mt-1.5 space-y-0.5">
        <p className="text-[10px] text-surface-600 dark:text-surface-300 flex items-center gap-1 truncate">
          <FontAwesomeIcon icon={faUser} className="w-2.5 h-2.5 shrink-0 opacity-60" />
          <span className="truncate">{teacher}</span>
        </p>
        <p className="text-[10px] text-surface-500 flex items-center gap-1 truncate">
          <FontAwesomeIcon icon={faDoorOpen} className="w-2.5 h-2.5 shrink-0 opacity-60" />
          <span className="truncate">{room}</span>
        </p>
        {showClass && cell.class_section?.label && (
          <p className="text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-1 truncate">
            <FontAwesomeIcon icon={faGraduationCap} className="w-2.5 h-2.5 shrink-0" />
            {cell.class_section.label}
          </p>
        )}
        {cell.notes && (
          <p className="text-[9px] text-surface-400 flex items-start gap-1 line-clamp-2">
            <FontAwesomeIcon icon={faStickyNote} className="w-2.5 h-2.5 shrink-0 mt-0.5" />
            {cell.notes}
          </p>
        )}
      </div>
      {hasConflict && (
        <span className="inline-block mt-1 text-[9px] font-semibold text-danger-600 dark:text-danger-400">
          ⚠
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
      className="w-full h-full min-h-[96px] rounded-lg border border-dashed border-surface-300/70 dark:border-surface-600/60 bg-surface-50/40 dark:bg-surface-800/20 hover:border-primary-400 hover:bg-primary-500/5 flex flex-col items-center justify-center gap-1.5 transition-all group"
    >
      <span className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20">
        <FontAwesomeIcon icon={faPlus} className="w-3 h-3 text-primary-600 dark:text-primary-400" />
      </span>
      <span className="text-[10px] font-medium text-surface-400 group-hover:text-primary-600 dark:group-hover:text-primary-400">
        {label}
      </span>
    </button>
  );
}

export default function EmploiDuTempsGrid({
  cells = {},
  periods = TIMETABLE_PERIODS,
  days = TIMETABLE_DAYS,
  loading = false,
  conflictKeys = new Set(),
  conflictEntryIds: conflictIds = new Set(),
  onAddSession,
  onEditSession,
  onDeleteSession,
  onDragEntryStart,
  onCellDrop,
  dragEntryId = null,
  readOnly = false,
  showClassLabel = false,
  className = '',
}) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');

  const dayLabels = useMemo(
    () =>
      days.map((d) => ({
        ...d,
        label: isFr ? d.labelFr ?? d.label : d.label,
      })),
    [days, isFr]
  );

  if (loading) {
    return (
      <div className={`emploi-du-temps-grid rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden bg-white dark:bg-surface-900 ${className}`}>
        <div className="h-12 bg-gradient-to-r from-slate-700 to-slate-800 animate-pulse" />
        <div className="p-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`emploi-du-temps-grid rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden bg-white dark:bg-surface-900 shadow-sm print:shadow-none print:border-surface-300 ${className}`}
    >
      <div className="scroll-hint-x overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[960px] border-collapse">
          <thead className="print:table-header-group">
            <tr className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white">
              <th className="sticky left-0 z-30 w-28 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide bg-slate-800 dark:bg-slate-900 border-r border-white/10 print:static">
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faClock} className="w-3 h-3 opacity-80" />
                  {t('timetable.period')}
                </span>
              </th>
              {dayLabels.map((day) => (
                <th
                  key={day.value}
                  className="sticky top-0 z-20 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide min-w-[120px] border-l border-white/10"
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
                className={
                  rowIdx % 2 === 0
                    ? 'bg-surface-50/80 dark:bg-surface-800/30'
                    : 'bg-white dark:bg-surface-900'
                }
              >
                <td className="sticky left-0 z-10 px-3 py-2 border-r border-surface-200/80 dark:border-surface-700/60 bg-inherit print:static">
                  <p className="text-[11px] font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">
                    {period.label}
                  </p>
                </td>
                {dayLabels.map((day) => {
                  const key = cellKey(day.value, period.start);
                  const cell = cells[key];
                  const hasConflict =
                    conflictKeys.has(key) ||
                    (cell?.id && conflictIds.has(cell.id));

                  return (
                    <td
                      key={key}
                      className={`p-1 align-top border-l border-surface-100 dark:border-surface-800 ${
                        dragEntryId ? 'bg-primary-500/[0.04]' : ''
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
                          <SessionCell
                            cell={cell}
                            hasConflict={hasConflict}
                            readOnly={readOnly}
                            showClass={showClassLabel}
                            onEdit={
                              readOnly
                                ? undefined
                                : () =>
                                    onEditSession?.({
                                      day: day.value,
                                      dayLabel: dayLabel(day.value, isFr),
                                      period,
                                      cell,
                                      key,
                                    })
                            }
                            onDelete={
                              readOnly
                                ? undefined
                                : () =>
                                    onDeleteSession?.({
                                      day: day.value,
                                      period,
                                      cell,
                                      key,
                                    })
                            }
                          />
                        </div>
                      ) : readOnly ? (
                        <div className="min-h-[96px] rounded-lg bg-surface-100/40 dark:bg-surface-800/20 border border-surface-200/30 dark:border-surface-700/30" />
                      ) : (
                        <EmptyCell
                          onAdd={() =>
                            onAddSession?.({
                              day: day.value,
                              dayLabel: dayLabel(day.value, isFr),
                              period,
                              cell: null,
                              key,
                            })
                          }
                          label={t('timetable.addSessionShort', { defaultValue: '+' })}
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
