import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDay,
  faClock,
  faDoorOpen,
  faUser,
  faGraduationCap,
  faSun,
  faMoon,
  faArrowsRotate,
  faCheck,
  faArrowRight,
  faBookOpen,
  faCommentDots,
  faListCheck,
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { timetablesAPI } from '../../services/api';
import { dayLabel, formatTimeRange } from '../../utils/timetableConstants';
import { paletteForCourse } from '../../utils/scheduleUtils';
import { Button, Badge, Modal } from '../common/UI';

const REASON_MAX = 1000;

function sessionStatusBadge(status, t) {
  const colors = {
    scheduled: 'info',
    rescheduled: 'success',
    cancelled: 'gray',
    completed: 'gray',
    pending: 'warning',
  };
  return {
    color: colors[status] ?? 'gray',
    label: t(`timetable.sessionStatus.${status}`, { defaultValue: status }),
  };
}

function SectionHeader({ icon, title, subtitle, badge }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={icon} className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-surface-900 dark:text-white text-sm sm:text-base">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {badge}
    </div>
  );
}

function SessionDetailCard({ session, isFr, variant = 'default', compact = false }) {
  const { t } = useTranslation();
  if (!session) return null;

  const palette = paletteForCourse(session.course?.id);
  const teacher = session.teacher?.user?.name ?? session.course?.teacher?.user?.name ?? '—';
  const classLabel = session.class_section?.label ?? '—';
  const room = session.room || session.course?.room || '—';
  const status = sessionStatusBadge(session.session_status ?? 'scheduled', t);

  const variantStyles = {
    default: `${palette.bg} ${palette.border} border-l-[4px]`,
    muted: 'bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700',
    success: 'bg-success-500/8 dark:bg-success-500/10 border border-success-500/25 border-l-[4px] border-l-success-500',
  };

  const rows = [
    { icon: faUser, label: t('timetable.teacher'), value: teacher },
    { icon: faGraduationCap, label: t('timetable.myClass'), value: classLabel },
    { icon: faDoorOpen, label: t('timetable.classroom'), value: room },
    { icon: faCalendarDay, label: t('timetable.day'), value: dayLabel(session.day_of_week, isFr) },
    { icon: faClock, label: t('timetable.period'), value: formatTimeRange(session.start_time, session.end_time) },
  ];

  return (
    <article
      className={`rounded-2xl p-4 shadow-sm transition-all duration-300 ${variantStyles[variant] ?? variantStyles.default} ${
        compact ? 'p-3' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg ${palette.bg} flex items-center justify-center shrink-0`}>
            <FontAwesomeIcon icon={faBookOpen} className={`w-3.5 h-3.5 ${palette.text}`} />
          </div>
          <p className={`font-display font-bold text-base sm:text-lg leading-tight ${palette.text}`}>
            {session.course?.name ?? '—'}
          </p>
        </div>
        {!compact && (
          <Badge color={status.color} size="sm" dot>
            {status.label}
          </Badge>
        )}
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {rows.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-2 min-w-0">
            <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5 text-surface-400 shrink-0" />
            <span className="text-[11px] uppercase tracking-wide text-surface-400 shrink-0">{label}</span>
            <span className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function SlotCard({ slot, isFr, active, onSelect, t }) {
  const isMorning = slot.band === 'morning';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full text-left rounded-2xl border p-4 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900 ${
        active
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 shadow-md shadow-primary-500/10 scale-[1.02] ring-2 ring-primary-500/30'
          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {active && (
        <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm">
          <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
        </span>
      )}

      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isMorning
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          <FontAwesomeIcon icon={isMorning ? faSun : faMoon} className="w-3.5 h-3.5" />
        </div>
        <Badge color={isMorning ? 'warning' : 'info'} size="xs">
          {isMorning ? t('timetable.reschedule.morning') : t('timetable.reschedule.afternoon')}
        </Badge>
      </div>

      <p className="font-semibold text-surface-900 dark:text-white text-sm sm:text-base">
        {isFr ? slot.day_label_fr || slot.day_label : slot.day_label}
      </p>
      <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 flex items-center gap-1.5">
        <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 opacity-60" />
        {formatTimeRange(slot.start_time, slot.end_time)}
      </p>
    </button>
  );
}

function SlotsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse border border-surface-200/50 dark:border-surface-700/50"
        />
      ))}
    </div>
  );
}

export default function TimetableRescheduleModal({ entry, open, onClose, onSubmitted }) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entryData, setEntryData] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open || !entry?.id) return undefined;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setSelectedKey('');
      setReason('');
      try {
        const { data } = await timetablesAPI.availableSlots(entry.id);
        if (cancelled) return;
        setEntryData(data.data?.entry ?? entry);
        setSlots(data.data?.available_slots ?? []);
      } catch (err) {
        toast.error(err.response?.data?.message || t('timetable.reschedule.loadSlotsFailed'));
        onClose?.();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, entry?.id, entry, onClose, t]);

  const selectedSlot = slots.find((s) => `${s.day_of_week}|${s.start_time}` === selectedKey);
  const original = entryData ?? entry;

  const proposedSession = selectedSlot
    ? {
        ...original,
        day_of_week: selectedSlot.day_of_week,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      }
    : null;

  const handleSubmit = async () => {
    if (!selectedSlot || !entry?.id) {
      toast.error(t('timetable.reschedule.selectSlot'));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await timetablesAPI.submitRescheduleRequest(entry.id, {
        proposed_day_of_week: selectedSlot.day_of_week,
        proposed_start_time: selectedSlot.start_time,
        proposed_end_time: selectedSlot.end_time,
        reason: reason.trim() || undefined,
      });
      toast.success(data.message || t('timetable.reschedule.submitted'));
      onSubmitted?.(data.data);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('timetable.reschedule.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 w-full">
      <Button variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
        {t('common.cancel')}
      </Button>
      <Button
        onClick={handleSubmit}
        loading={submitting}
        disabled={loading || !selectedSlot || slots.length === 0}
        icon={faArrowsRotate}
        className="w-full sm:w-auto"
      >
        {t('timetable.reschedule.submitButton')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('timetable.reschedule.title')}
      size="lg"
      footer={footer}
    >
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        <p className="text-sm text-surface-500 dark:text-surface-400 -mt-1">
          {t('timetable.reschedule.subtitle')}
        </p>

        {/* 1. Current session card */}
        <section>
          <SectionHeader
            icon={faCalendarDay}
            title={t('timetable.reschedule.currentSession')}
          />
          <SessionDetailCard session={original} isFr={isFr} variant="default" />
        </section>

        {/* 2. Choose new slot */}
        <section>
          <SectionHeader
            icon={faArrowsRotate}
            title={t('timetable.reschedule.chooseNewSlot')}
            badge={
              !loading && slots.length > 0 ? (
                <Badge color="info" size="sm">
                  {t('timetable.reschedule.slotsAvailable', { count: slots.length })}
                </Badge>
              ) : null
            }
          />

          {loading ? (
            <SlotsSkeleton />
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/25 p-4 sm:p-5 text-sm text-amber-800 dark:text-amber-200">
              {t('timetable.reschedule.noSlots')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[min(320px,50vh)] overflow-y-auto overscroll-contain pe-1">
              {slots.map((slot) => {
                const key = `${slot.day_of_week}|${slot.start_time}`;
                return (
                  <SlotCard
                    key={key}
                    slot={slot}
                    isFr={isFr}
                    active={selectedKey === key}
                    onSelect={() => setSelectedKey(key)}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Reason */}
        <section>
          <SectionHeader
            icon={faCommentDots}
            title={t('timetable.reschedule.reasonSection')}
            subtitle={t('timetable.reschedule.reasonOptional')}
          />
          <div className="relative">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
              rows={4}
              maxLength={REASON_MAX}
              className="w-full rounded-2xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/80 px-4 py-3 text-sm text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-shadow resize-none"
              placeholder={t('timetable.reschedule.reasonPlaceholder')}
            />
            <p className="text-right text-xs text-surface-400 mt-1.5 tabular-nums">
              {t('timetable.reschedule.charCount', { count: reason.length, max: REASON_MAX })}
            </p>
          </div>
        </section>

        {/* 4. Summary before validation */}
        {selectedSlot && proposedSession && (
          <section className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-800/40 p-4 sm:p-5 animate-fade-in">
            <SectionHeader
              icon={faListCheck}
              title={t('timetable.reschedule.summaryTitle')}
              subtitle={t('timetable.reschedule.summaryHint')}
            />

            <div className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 mb-2">
                  {t('timetable.reschedule.originalSession')}
                </p>
                <SessionDetailCard session={original} isFr={isFr} variant="muted" compact />
              </div>

              <div className="flex items-center justify-center lg:flex-col lg:justify-center shrink-0 py-1 lg:py-0 lg:px-1">
                <div className="w-10 h-10 rounded-full bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="w-4 h-4 text-primary-600 dark:text-primary-400 rotate-90 lg:rotate-0 transition-transform"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-success-600 dark:text-success-400 mb-2">
                  {t('timetable.reschedule.newSession')}
                </p>
                <SessionDetailCard session={proposedSession} isFr={isFr} variant="success" compact />
              </div>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

// Re-export helpers and card from separate file to avoid circular issues - actually keep exports in same file

export function RescheduleRequestCard({ request, isFr, onCancel, showActions = 'teacher' }) {
  const { t } = useTranslation();
  const statusColor = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'gray',
  }[request.status] ?? 'gray';

  return (
    <article className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-surface-900 dark:text-white">
            {request.entry?.course?.name ?? t('timetable.subject')}
          </p>
          <p className="text-xs text-surface-500">{request.entry?.class_section?.label}</p>
        </div>
        <Badge color={statusColor} size="sm">
          {t(`timetable.sessionStatus.${request.status}`, { defaultValue: request.status })}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-surface-50 dark:bg-surface-800/50 p-2.5">
          <p className="text-[10px] uppercase text-surface-500 font-semibold">{t('timetable.reschedule.originalSession')}</p>
          <p className="mt-1 text-surface-800 dark:text-surface-200">
            {dayLabel(request.original_session.day_of_week, isFr)}
            {' · '}
            {formatTimeRange(request.original_session.start_time, request.original_session.end_time)}
          </p>
        </div>
        <div className="rounded-lg bg-primary-50/50 dark:bg-primary-950/20 p-2.5">
          <p className="text-[10px] uppercase text-primary-600 dark:text-primary-400 font-semibold">{t('timetable.reschedule.proposedSession')}</p>
          <p className="mt-1 text-surface-800 dark:text-surface-200">
            {dayLabel(request.proposed_session.day_of_week, isFr)}
            {' · '}
            {formatTimeRange(request.proposed_session.start_time, request.proposed_session.end_time)}
          </p>
        </div>
      </div>

      {request.reason && (
        <p className="text-xs text-surface-500">
          <span className="font-semibold">{t('timetable.reschedule.reason')}:</span> {request.reason}
        </p>
      )}
      {request.admin_notes && (
        <p className="text-xs text-surface-500">
          <span className="font-semibold">{t('timetable.reschedule.adminNotes')}:</span> {request.admin_notes}
        </p>
      )}

      {showActions === 'teacher' && request.status === 'pending' && onCancel && (
        <Button size="sm" variant="outline" onClick={() => onCancel(request)}>
          {t('timetable.reschedule.cancelRequest')}
        </Button>
      )}
    </article>
  );
}

export { sessionStatusBadge };