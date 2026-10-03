import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { timetablesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { PageHeader, Card, Button, Badge } from '../common/UI';
import EmploiDuTempsGrid from './EmploiDuTempsGrid';
import TimetableRescheduleModal, {
  RescheduleRequestCard,
  sessionStatusBadge,
} from './TimetableRescheduleModal';
import { dayLabel, formatTimeRange } from '../../utils/timetableConstants';

export default function TimetableTeacherView() {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduleEntry, setRescheduleEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await timetablesAPI.mine();
      setData(res.data);
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      console.error('[EmploiDuTemps] teacher load failed', err);
      toast.error(
        isTimeout
          ? t('timetable.loadTimeout', { defaultValue: 'Loading took too long. Check that the server is running, then retry.' })
          : t('timetable.loadError')
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const sessionCount = data?.sessions?.length ?? 0;
  const classCount = useMemo(() => {
    const labels = new Set(
      (data?.sessions ?? []).map((s) => s.class_section?.label).filter(Boolean)
    );
    return labels.size;
  }, [data?.sessions]);

  const upcomingReschedulable = useMemo(
    () =>
      (data?.sessions ?? []).filter(
        (s) =>
          ['scheduled', 'rescheduled'].includes(s.session_status) && !s.pending_reschedule
      ),
    [data?.sessions]
  );

  const openReschedule = (entry) => {
    setRescheduleEntry(entry);
    setModalOpen(true);
  };

  const handleCancelRequest = async (request) => {
    try {
      await timetablesAPI.cancelRescheduleRequest(request.id);
      toast.success(t('timetable.reschedule.cancelled'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('timetable.reschedule.cancelFailed'));
    }
  };

  return (
    <div className="w-full max-w-none space-y-4">
      <PageHeader
        title={t('timetable.title')}
        subtitle={t('timetable.teacherSubtitle', { name: user?.name ?? '' })}
      />

      <div className="stat-cards-grid" data-cols="2">
        <Card className="!p-4 w-full min-w-0 h-full">
          <p className="text-xs text-surface-500">{t('timetable.mySessions')}</p>
          <p className="text-2xl font-bold text-primary-600">{sessionCount}</p>
        </Card>
        <Card className="!p-4 w-full min-w-0 h-full">
          <p className="text-xs text-surface-500">{t('timetable.classesTaught')}</p>
          <p className="text-2xl font-bold text-violet-600">{classCount}</p>
        </Card>
      </div>

      {upcomingReschedulable.length > 0 && (
        <Card className="!p-4 space-y-3">
          <h3 className="font-semibold text-surface-900 dark:text-white">
            {t('timetable.reschedule.mySessionsTitle')}
          </h3>
          <p className="text-sm text-surface-500">{t('timetable.reschedule.mySessionsHint')}</p>
          <div className="space-y-2">
            {upcomingReschedulable.map((session) => {
              const badge = sessionStatusBadge(session.session_status, t);
              return (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-surface-900 dark:text-white">{session.course?.name}</p>
                      <Badge color={badge.color} size="sm">{badge.label}</Badge>
                    </div>
                    <p className="text-sm text-surface-500 mt-0.5">
                      {session.class_section?.label} · {dayLabel(session.day_of_week, isFr)}{' '}
                      {formatTimeRange(session.start_time, session.end_time)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    icon={faArrowsRotate}
                    onClick={() => openReschedule(session)}
                  >
                    {t('timetable.reschedule.action')}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(data?.reschedule_requests?.length ?? 0) > 0 && (
        <Card className="!p-4 space-y-3">
          <h3 className="font-semibold text-surface-900 dark:text-white">
            {t('timetable.reschedule.myRequestsTitle')}
          </h3>
          <div className="space-y-3">
            {data.reschedule_requests.map((request) => (
              <RescheduleRequestCard
                key={request.id}
                request={request}
                isFr={isFr}
                onCancel={handleCancelRequest}
              />
            ))}
          </div>
        </Card>
      )}

      <Card className="!p-4">
        <p className="text-sm text-surface-500 mb-4">{t('timetable.teacherReadOnly')}</p>
        <EmploiDuTempsGrid
          cells={data?.cells ?? {}}
          periods={data?.periods}
          days={data?.days}
          loading={loading}
          readOnly
          showClassLabel
        />
      </Card>

      <TimetableRescheduleModal
        entry={rescheduleEntry}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setRescheduleEntry(null);
        }}
        onSubmitted={() => load()}
      />
    </div>
  );
}
