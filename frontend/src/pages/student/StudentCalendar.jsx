import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { eventsAPI } from '../../services/api';
import { GlassCard, StudentPageShell } from '../../components/student/StudentUI';
import { Badge } from '../../components/common/UI';
import {
  EVENT_TYPES,
  TYPE_BADGE_COLORS,
  WEEKDAYS,
  buildMonthGrid,
  eventOnDay,
  formatPeriodLabel,
  getFetchRange,
  getWeekDays,
  navigateCursor,
} from '../../utils/calendar';

const EVENT_TYPE_KEYS = {
  exam: 'studentPages.eventExam',
  meeting: 'studentPages.eventMeeting',
  holiday: 'studentPages.eventHoliday',
  event: 'studentPages.eventEvent',
};

const VIEW_KEYS = {
  month: 'studentPages.viewMonth',
  week: 'studentPages.viewWeek',
};

export default function StudentCalendar() {
  const { t } = useTranslation();
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const periodLabel = formatPeriodLabel(view, cursor);

  const eventTypes = useMemo(
    () => EVENT_TYPES.map((item) => ({
      ...item,
      label: t(EVENT_TYPE_KEYS[item.value] || EVENT_TYPE_KEYS.event),
    })),
    [t]
  );

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const range = getFetchRange(view, cursor);
    try {
      const { data } = await eventsAPI.list({ ...range, per_page: 100 });
      setEvents(data.data ?? []);
    } catch {
      toast.error(t('studentPages.loadEventsFailed'));
    } finally {
      setLoading(false);
    }
  }, [cursor, view, t]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const monthCells = useMemo(() => (view === 'month' ? buildMonthGrid(cursor) : []), [view, cursor]);
  const weekDays = useMemo(() => (view === 'week' ? getWeekDays(cursor) : []), [view, cursor]);

  const eventsForDate = (date) => events.filter((e) => eventOnDay(e, date));

  return (
    <StudentPageShell title={t('studentPages.calendarTitle')} subtitle={t('studentPages.calendarSubtitle')}>
      <div className="flex flex-wrap gap-3 mb-4">
        {eventTypes.map((item) => (
          <span key={item.value} className="inline-flex items-center gap-2 text-xs text-surface-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursor(navigateCursor(cursor, view, -1))}
              className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label={t('studentPages.previousPeriod')}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-surface-900 dark:text-white min-w-[160px] text-center">{periodLabel}</h2>
            <button
              type="button"
              onClick={() => setCursor(navigateCursor(cursor, view, 1))}
              className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label={t('studentPages.nextPeriod')}
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setCursor(new Date())} className="text-xs text-primary-500 hover:underline">
              {t('studentPages.today')}
            </button>
          </div>
          <div className="flex rounded-xl border border-surface-200 dark:border-surface-700 p-1">
            {['month', 'week'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  view === v ? 'bg-primary-500 text-white' : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                {t(VIEW_KEYS[v])}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-48 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
        ) : view === 'month' ? (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-surface-400 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((date, i) => {
                const dayEvents = date ? eventsForDate(date) : [];
                const isToday = date && new Date().toDateString() === date.toDateString();
                return (
                  <div
                    key={i}
                    className={`min-h-[72px] sm:min-h-[88px] rounded-xl border p-1.5 ${
                      date
                        ? `border-surface-200 dark:border-surface-700 ${isToday ? 'ring-2 ring-primary-500/40' : ''}`
                        : 'border-transparent'
                    }`}
                  >
                    {date && (
                      <>
                        <span className={`text-xs font-medium ${isToday ? 'text-primary-500' : 'text-surface-500'}`}>
                          {date.getDate()}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => setSelected(ev)}
                              className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate border ${TYPE_BADGE_COLORS[ev.type] ?? TYPE_BADGE_COLORS.event}`}
                            >
                              {ev.title}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const dayEvents = eventsForDate(date);
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div
                  key={date.toISOString()}
                  className={`rounded-xl border p-3 min-h-[120px] ${
                    isToday ? 'border-primary-500/50 bg-primary-500/5' : 'border-surface-200 dark:border-surface-700'
                  }`}
                >
                  <p className="text-xs font-semibold text-surface-500 mb-2">
                    {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </p>
                  {dayEvents.length ? (
                    <ul className="space-y-1">
                      {dayEvents.map((ev) => (
                        <li key={ev.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(ev)}
                            className={`w-full text-left text-xs px-2 py-1 rounded-lg border truncate ${TYPE_BADGE_COLORS[ev.type] ?? TYPE_BADGE_COLORS.event}`}
                          >
                            {ev.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-surface-400">—</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div onClick={(e) => e.stopPropagation()} className="max-w-md w-full">
            <GlassCard>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-surface-900 dark:text-white">{selected.title}</h3>
                  <Badge color="primary" size="xs" className="mt-1 capitalize">
                    {t(EVENT_TYPE_KEYS[selected.type] || EVENT_TYPE_KEYS.event, { defaultValue: selected.type })}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                  aria-label={t('common.close')}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
              <p className="text-sm text-surface-500 mb-3">
                {new Date(selected.start_date).toLocaleString()}
                {selected.end_date && ` — ${new Date(selected.end_date).toLocaleString()}`}
              </p>
              {selected.description && (
                <p className="text-sm text-surface-600 dark:text-surface-300">{selected.description}</p>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </StudentPageShell>
  );
}
