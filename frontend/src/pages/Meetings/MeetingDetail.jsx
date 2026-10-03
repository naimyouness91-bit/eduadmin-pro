import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faVideo, faLink, faUsers } from '@fortawesome/free-solid-svg-icons';
import { meetingsAPI } from '../../services/api';
import { PageHeader, Card, Button, Badge } from '../../components/common/UI';
import ParticipantsList from '../../components/meetings/ParticipantsList';

export default function MeetingDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [participants, setParticipants] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await meetingsAPI.get(id);
      setMeeting(data.data);
      setPermissions(data.permissions ?? {});
      const pRes = await meetingsAPI.participants(id);
      setParticipants(pRes.data.data ?? []);
      if (data.permissions?.can_manage) {
        const aRes = await meetingsAPI.attendance(id);
        setAttendance(aRes.data.data ?? []);
      }
    } catch {
      toast.error(t('meetingsPage.meetingNotFound'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = () => {
    if (meeting?.meeting_url) {
      navigator.clipboard.writeText(meeting.meeting_url);
      toast.success(t('meetingsPage.linkCopiedShort'));
    }
  };

  if (loading) return <p className="p-8">{t('common.loading')}</p>;
  if (!meeting) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/meetings" className="text-surface-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <PageHeader title={meeting.title} subtitle={meeting.description || t('meetingsPage.virtualMeeting')} />
        <Badge className="ms-auto capitalize">
          {t(`meetingsPage.statuses.${meeting.status}`, { defaultValue: meeting.status })}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {permissions.can_join && (
          <Link to={`/meetings/${id}/room`}>
            <Button>
              <FontAwesomeIcon icon={faVideo} className="me-2" />
              {t('meetingsPage.joinRoom')}
            </Button>
          </Link>
        )}
        <Button variant="ghost" onClick={copyLink}>
          <FontAwesomeIcon icon={faLink} className="me-2" />
          {t('meetingsPage.copyJitsiLink')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faUsers} />
            {t('meetingsPage.participants')}
          </h3>
          <ParticipantsList participants={participants} />
        </Card>

        {permissions.can_manage && attendance.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">{t('meetingsPage.attendance')}</h3>
            <ul className="space-y-2 text-sm">
              {attendance.map((row) => (
                <li key={row.user?.id} className="flex justify-between border-b border-surface-100 dark:border-surface-800 py-1">
                  <span>{row.user?.name}</span>
                  <span className={row.attended ? 'text-emerald-600' : 'text-surface-500'}>
                    {row.attended
                      ? t('meetingsPage.minutes', { count: Math.round((row.total_duration_seconds || 0) / 60) })
                      : t('common.absent')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Card className="p-4 text-sm text-surface-500">
        <p>
          <strong>{t('meetingsPage.scheduled')}</strong>{' '}
          {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : '—'}
        </p>
        <p className="mt-1 break-all">
          <strong>{t('meetingsPage.jitsiRoom')}</strong> {meeting.meeting_url}
        </p>
      </Card>
    </div>
  );
}
