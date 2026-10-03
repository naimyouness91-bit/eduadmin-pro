import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faUsers, faClock, faLink } from '@fortawesome/free-solid-svg-icons';
import { Badge, Button } from '../common/UI';

const STATUS_COLORS = {
  scheduled: 'blue',
  live: 'green',
  ended: 'gray',
  cancelled: 'red',
};

export default function MeetingCard({ meeting, onCopyLink }) {
  const { t } = useTranslation();

  const when = meeting.scheduled_at
    ? new Date(meeting.scheduled_at).toLocaleString()
    : t('meetingsPage.notScheduled');

  const handleCopy = (e) => {
    e.preventDefault();
    if (meeting.meeting_url && onCopyLink) {
      onCopyLink(meeting.meeting_url);
    }
  };

  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-4 hover:border-primary-400 transition shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display font-semibold text-surface-900 dark:text-white line-clamp-1">
          {meeting.title}
        </h3>
        <Badge color={STATUS_COLORS[meeting.status] || 'gray'} size="sm">
          {t(`meetingsPage.statuses.${meeting.status}`, { defaultValue: meeting.status })}
        </Badge>
      </div>
      {meeting.description && (
        <p className="text-sm text-surface-500 line-clamp-2 mb-3">{meeting.description}</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-surface-500 mb-4">
        <span className="flex items-center gap-1">
          <FontAwesomeIcon icon={faClock} />
          {when}
        </span>
        <span className="flex items-center gap-1">
          <FontAwesomeIcon icon={faUsers} />
          {t('meetingsPage.invitedCount', { count: meeting.participants_count ?? 0 })}
        </span>
        {meeting.course && (
          <span className="text-primary-600">{meeting.course.name}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/meetings/${meeting.id}/room`}>
          <Button size="sm">
            <FontAwesomeIcon icon={faVideo} className="me-1" />
            {t('meetingsPage.join')}
          </Button>
        </Link>
        <Link to={`/meetings/${meeting.id}`}>
          <Button size="sm" variant="ghost">
            {t('meetingsPage.details')}
          </Button>
        </Link>
        {meeting.meeting_url && (
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            <FontAwesomeIcon icon={faLink} />
          </Button>
        )}
      </div>
    </div>
  );
}
