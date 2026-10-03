import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TIMETABLE_DAYS, TIMETABLE_PERIODS, cellKey } from '../../utils/timetableConstants';

function CellContent({ cell, compact }) {
  if (!cell) {
    return <span className="text-surface-300 dark:text-surface-600 text-xs">—</span>;
  }

  const subject = cell.course?.name ?? '—';
  const teacher = cell.teacher?.user?.name ?? '';
  const room = cell.room ?? '';

  return (
    <div className={`text-left ${compact ? 'p-1.5' : 'p-2'}`}>
      <p className={`font-semibold text-primary-700 dark:text-primary-300 leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {subject}
      </p>
      {!compact && (
        <>
          {teacher && (
            <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1 truncate">{teacher}</p>
          )}
          {room && (
            <p className="text-[10px] text-surface-400 font-mono mt-0.5">{room}</p>
          )}
          {cell.class_section?.label && (
            <p className="text-[9px] text-violet-500 mt-0.5">{cell.class_section.label}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function MoroccanTimetableGrid({
  cells = {},
  periods = TIMETABLE_PERIODS,
  days = TIMETABLE_DAYS,
  loading = false,
  editable = false,
  conflictKeys = new Set(),
  onCellClick,
  onCellDrop,
  onDragEntryStart,
  dragEntryId = null,
  compact = false,
  headerTitle,
  headerSubtitle,
}) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');

  const dayLabels = useMemo(
    () =>
      days.map((d) => ({
        ...d,
        label: isFr ? d.short : d.label,
      })),
    [days, isFr]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden">
        <div className="h-12 bg-surface-100 dark:bg-surface-800 animate-pulse" />
        <div className="grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700 p-px">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-50 dark:bg-surface-900 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden shadow-sm bg-white dark:bg-surface-900">
      {(headerTitle || headerSubtitle) && (
        <div className="px-4 py-3 border-b border-surface-200/80 dark:border-surface-700/60 bg-gradient-to-r from-primary-500/10 to-violet-500/10">
          {headerTitle && (
            <h3 className="text-sm font-bold text-surface-900 dark:text-white">{headerTitle}</h3>
          )}
          {headerSubtitle && (
            <p className="text-xs text-surface-500 mt-0.5">{headerSubtitle}</p>
          )}
        </div>
      )}
      <div className="scroll-hint-x overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-100/90 dark:bg-surface-800/90">
              <th className="sticky left-0 z-10 bg-surface-100 dark:bg-surface-800 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300 border-b border-r border-surface-200/80 dark:border-surface-700/60 w-28">
                {t('timetable.period', { defaultValue: 'Créneau' })}
              </th>
              {dayLabels.map((day) => (
                <th
                  key={day.value}
                  className="px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-surface-700 dark:text-surface-200 border-b border-surface-200/80 dark:border-surface-700/60 min-w-[100px]"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.start} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
                <td className="sticky left-0 z-10 bg-surface-50 dark:bg-surface-900/80 px-3 py-2 text-[10px] sm:text-xs font-semibold text-surface-600 dark:text-surface-400 border-r border-surface-200/80 dark:border-surface-700/60 whitespace-nowrap">
                  {period.label}
                </td>
                {dayLabels.map((day) => {
                  const key = cellKey(day.value, period.start);
                  const cell = cells[key];
                  const hasConflict = conflictKeys.has(key);
                  const isDropTarget = editable && dragEntryId;

                  return (
                    <td
                      key={key}
                      className={`p-0 align-top border-l border-surface-100 dark:border-surface-800 transition-colors ${
                        hasConflict ? 'bg-danger-500/10 ring-1 ring-inset ring-danger-500/40' : ''
                      } ${editable ? 'cursor-pointer hover:bg-primary-500/5' : ''}`}
                      onClick={() => editable && onCellClick?.({ day: day.value, period, cell, key })}
                      onDragOver={(e) => {
                        if (editable && dragEntryId) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (editable && onCellDrop) {
                          onCellDrop({ day: day.value, period, key });
                        }
                      }}
                    >
                      <div
                        className={`min-h-[72px] sm:min-h-[80px] h-full ${
                          isDropTarget ? 'border-2 border-dashed border-primary-400/50' : ''
                        } ${cell ? 'bg-primary-500/[0.04]' : ''}`}
                        draggable={editable && Boolean(cell?.id)}
                        onDragStart={(e) => {
                          if (cell?.id) {
                            e.dataTransfer.setData('entryId', String(cell.id));
                            onDragEntryStart?.(cell.id);
                          }
                        }}
                      >
                        <CellContent cell={cell} compact={compact} />
                      </div>
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
