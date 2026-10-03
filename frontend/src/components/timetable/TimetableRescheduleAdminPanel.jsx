import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { timetablesAPI } from '../../services/api';
import { RescheduleRequestCard } from './TimetableRescheduleModal';
import { Button, Badge } from '../common/UI';

export default function TimetableRescheduleAdminPanel({ onReviewed }) {
  const { t, i18n } = useTranslation();
  const isFr = i18n.language?.startsWith('fr');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await timetablesAPI.listRescheduleRequests(
        filter === 'all' ? undefined : { status: filter }
      );
      setRequests(data.data ?? []);
    } catch {
      toast.error(t('timetable.reschedule.adminLoadFailed'));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (request) => {
    setBusyId(request.id);
    try {
      await timetablesAPI.approveRescheduleRequest(request.id);
      toast.success(t('timetable.reschedule.approved'));
      await load();
      onReviewed?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('timetable.reschedule.approveFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request) => {
    setBusyId(request.id);
    try {
      await timetablesAPI.rejectRescheduleRequest(request.id);
      toast.success(t('timetable.reschedule.rejected'));
      await load();
      onReviewed?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('timetable.reschedule.rejectFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-semibold text-surface-900 dark:text-white">
            {t('timetable.reschedule.adminTitle')}
          </h3>
          <p className="text-xs text-surface-500">{t('timetable.reschedule.adminHint')}</p>
        </div>
        {filter === 'pending' && pendingCount > 0 && (
          <Badge color="warning">{pendingCount} {t('timetable.reschedule.pending')}</Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${
              filter === key
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-surface-200 dark:border-surface-700'
            }`}
          >
            {t(`timetable.reschedule.filter.${key}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-surface-500">{t('common.loading')}</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-surface-500">{t('timetable.reschedule.adminEmpty')}</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {requests.map((request) => (
            <div key={request.id} className="space-y-2">
              <RescheduleRequestCard request={request} isFr={isFr} showActions={false} />
              {request.status === 'pending' && (
                <div className="flex gap-2 ps-1">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    loading={busyId === request.id}
                    disabled={!!busyId}
                  >
                    {t('timetable.reschedule.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request)}
                    disabled={!!busyId}
                  >
                    {t('timetable.reschedule.reject')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
