import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { eventsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import StudentCalendar from '../student/StudentCalendar';
import { PageHeader, Card, Button, Modal, FormField, Input, Textarea, Select, Badge } from '../../components/common/UI';
import {
  EVENT_TYPES,
  TYPE_COLORS,
  WEEKDAYS,
  buildMonthGrid,
  colorForType,
  eventOnDay,
  formatPeriodLabel,
  getFetchRange,
  getWeekDays,
  navigateCursor,
  toDatetimeLocalValue,
} from '../../utils/calendar';

const EMPTY_FORM = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  type: 'event',
  color: colorForType('event'),
  is_public: true,
};

const EVENT_TYPE_KEYS = {
  exam: 'eventsPage.typeExam',
  meeting: 'eventsPage.typeMeeting',
  holiday: 'eventsPage.typeHoliday',
  event: 'eventsPage.typeEvent',
};

export default function EventsCalendar() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentCalendar />;
  return <EventsCalendarAdmin />;
}

function EventsCalendarAdmin() {
  const { t, i18n } = useTranslation();
  const { hasRole } = useAuthStore();
  const canManage = hasRole('super_admin', 'admin');
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const periodLabel = formatPeriodLabel(view, cursor);
  const eventTypeLabel = (type) => t(EVENT_TYPE_KEYS[type] || EVENT_TYPE_KEYS.event);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const range = getFetchRange(view, cursor);
    try {
      const { data } = await eventsAPI.list({ ...range, per_page: 100 });
      setEvents(data.data ?? []);
    } catch {
      toast.error(t('eventsPage.loadFailed'));
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

  const openCreate = (presetDate) => {
    setEditing(null);
    setViewing(null);
    const start = presetDate ? new Date(presetDate) : new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    setForm({
      ...EMPTY_FORM,
      start_date: toDatetimeLocalValue(start.toISOString()),
      end_date: toDatetimeLocalValue(end.toISOString()),
    });
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setViewing(null);
    setForm({
      title: event.title,
      description: event.description ?? '',
      start_date: toDatetimeLocalValue(event.start_date),
      end_date: toDatetimeLocalValue(event.end_date),
      type: event.type ?? 'event',
      color: event.color ?? colorForType(event.type),
      is_public: event.is_public !== false,
    });
    setModalOpen(true);
  };

  const openView = (event) => {
    if (canManage) {
      openEdit(event);
      return;
    }
    setViewing(event);
  };

  const handleTypeChange = (type) => {
    setForm((f) => ({ ...f, type, color: colorForType(type) }));
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await eventsAPI.update(editing.id, form);
        toast.success(t('eventsPage.eventUpdated'));
      } else {
        await eventsAPI.create(form);
        toast.success(t('eventsPage.eventCreated'));
      }
      setModalOpen(false);
      fetchEvents();
    } catch {
      toast.error(t('eventsPage.saveFailed'));
    }
  };

  const remove = async () => {
    if (!editing || !window.confirm(t('eventsPage.deleteConfirm'))) return;
    try {
      await eventsAPI.delete(editing.id);
      toast.success(t('eventsPage.eventDeleted'));
      setModalOpen(false);
      fetchEvents();
    } catch {
      toast.error(t('eventsPage.deleteFailed'));
    }
  };

  const shiftPeriod = (direction) => {
    setCursor(navigateCursor(cursor, view, direction));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('eventsPage.title')}
        subtitle={t('eventsPage.subtitle')}
        actions={canManage ? <Button icon={faPlus} onClick={() => openCreate()}>{t('eventsPage.newEvent')}</Button> : null}
      />

      <div className="flex flex-wrap gap-3">
        {EVENT_TYPES.map((evType) => (
          <span key={evType.value} className="inline-flex items-center gap-2 text-xs text-surface-500">
            <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[evType.value]}`} />
            {eventTypeLabel(evType.value)}
          </span>
        ))}
      </div>

      <Card padding={false}>
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftPeriod(-1)}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label={t('eventsPage.previousPeriod')}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h2 className="font-display font-bold text-base sm:text-lg text-surface-900 dark:text-white min-w-0 flex-1 text-center truncate px-1">
              {periodLabel}
            </h2>
            <button
              type="button"
              onClick={() => shiftPeriod(1)}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label={t('eventsPage.nextPeriod')}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="text-xs font-medium text-primary-500 hover:underline ml-1"
            >
              {t('eventsPage.today')}
            </button>
          </div>
          <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
            {['month', 'week'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  view === v ? 'bg-white dark:bg-surface-700 shadow-sm text-surface-900 dark:text-white' : 'text-surface-500'
                }`}
              >
                {v === 'month' ? t('eventsPage.viewMonth') : t('eventsPage.viewWeek')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 h-64 animate-pulse bg-surface-50 dark:bg-surface-900" />
        ) : view === 'month' ? (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-surface-400 py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((date, i) => {
                const dayEvents = date ? eventsForDate(date) : [];
                const isToday = date && new Date().toDateString() === date.toDateString();
                return (
                  <div
                    key={i}
                    className={`min-h-[72px] sm:min-h-[96px] rounded-xl border p-1.5 transition-colors ${
                      date
                        ? `border-surface-200 dark:border-surface-700 hover:border-primary-500/30 ${isToday ? 'ring-2 ring-primary-500/40' : ''}`
                        : 'border-transparent'
                    }`}
                  >
                    {date && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${isToday ? 'text-primary-500' : 'text-surface-500'}`}>
                            {date.getDate()}
                          </span>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openCreate(date)}
                              className="text-[10px] text-surface-400 hover:text-primary-500 opacity-0 hover:opacity-100 focus:opacity-100"
                              aria-label={t('eventsPage.addEvent')}
                            >
                              +
                            </button>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => openView(ev)}
                              className={`w-full text-left text-[10px] text-white px-1 py-0.5 rounded truncate ${TYPE_COLORS[ev.type] || 'bg-primary-500'}`}
                            >
                              {ev.title}
                            </button>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-[10px] text-surface-400 px-1">{t('eventsPage.moreEvents', { count: dayEvents.length - 3 })}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
              {weekDays.map((date) => {
                const dayEvents = eventsForDate(date);
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div
                    key={date.toISOString()}
                    className={`rounded-xl border p-3 min-h-[140px] ${
                      isToday
                        ? 'border-primary-500/50 bg-primary-500/5'
                        : 'border-surface-200 dark:border-surface-700'
                    }`}
                  >
                    <p className="text-xs font-semibold text-surface-500 mb-2">
                      {date.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric' })}
                    </p>
                    <div className="space-y-1.5">
                      {dayEvents.length === 0 ? (
                        <p className="text-[10px] text-surface-400">—</p>
                      ) : (
                        dayEvents.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => openView(ev)}
                            className={`w-full text-left text-xs text-white px-2 py-1 rounded-lg truncate ${TYPE_COLORS[ev.type] || 'bg-primary-500'}`}
                          >
                            {ev.title}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {canManage && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? t('eventsPage.editEvent') : t('eventsPage.newEventModal')}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 w-full">
              {editing ? <Button variant="danger" onClick={remove} className="w-full sm:w-auto">{t('common.delete')}</Button> : <span className="hidden sm:block" />}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="w-full sm:w-auto">{t('common.cancel')}</Button>
                <Button type="submit" form="event-form" className="w-full sm:w-auto">{t('common.save')}</Button>
              </div>
            </div>
          }
        >
          <form id="event-form" className="space-y-4" onSubmit={save}>
            <FormField label={t('eventsPage.titleLabel')} required>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </FormField>
            <FormField label={t('eventsPage.description')}>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t('eventsPage.start')} required>
                <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
              </FormField>
              <FormField label={t('eventsPage.end')} required>
                <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
              </FormField>
            </div>
            <FormField label={t('eventsPage.type')}>
              <Select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {EVENT_TYPES.map((evType) => (
                  <option key={evType.value} value={evType.value}>{eventTypeLabel(evType.value)}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('eventsPage.visibility')}>
              <Select
                value={form.is_public ? 'public' : 'private'}
                onChange={(e) => setForm({ ...form, is_public: e.target.value === 'public' })}
              >
                <option value="public">{t('eventsPage.visibilityPublic')}</option>
                <option value="private">{t('eventsPage.visibilityPrivate')}</option>
              </Select>
            </FormField>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal isOpen onClose={() => setViewing(null)} title={viewing.title} footer={<Button variant="outline" onClick={() => setViewing(null)}>{t('common.close')}</Button>}>
          <div className="space-y-3">
            <Badge color="primary" className="capitalize">{eventTypeLabel(viewing.type)}</Badge>
            <p className="text-sm text-surface-500">
              {new Date(viewing.start_date).toLocaleString(i18n.language)}
              {viewing.end_date && ` — ${new Date(viewing.end_date).toLocaleString(i18n.language)}`}
            </p>
            {viewing.description && <p className="text-sm text-surface-600 dark:text-surface-300">{viewing.description}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
