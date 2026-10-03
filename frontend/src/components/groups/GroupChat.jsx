import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faBullhorn,
  faVideo,
  faClipboardList,
  faComments,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { formatTime } from '../../utils/formatTime';
import { Avatar, Button } from '../common/UI';

function MessageBubble({ message }) {
  const { t } = useTranslation();
  const meta = message.metadata || {};

  if (message.type === 'announcement') {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1">
          <FontAwesomeIcon icon={faBullhorn} />
          {meta.title || t('groupsPage.messageTypes.announcement')}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  if (message.type === 'discussion') {
    return (
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-1">
          <FontAwesomeIcon icon={faComments} />
          {meta.title || t('groupsPage.messageTypes.discussion')}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  if (message.type === 'meeting') {
    const sessionLabel = meta.kind === 'session'
      ? t('groupsPage.messageTypes.liveSession')
      : t('groupsPage.messageTypes.meeting');
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-1">
          <FontAwesomeIcon icon={faVideo} />
          {meta.title || sessionLabel}
        </p>
        <p className="text-sm">{message.content}</p>
        {meta.starts_at && (
          <p className="text-xs text-surface-500 mt-1">{new Date(meta.starts_at).toLocaleString()}</p>
        )}
        {meta.meeting_url && (
          <a
            href={meta.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 underline mt-2 inline-block"
          >
            {meta.kind === 'session'
              ? t('groupsPage.messageTypes.joinSession')
              : t('groupsPage.messageTypes.joinMeeting')}
          </a>
        )}
      </div>
    );
  }

  if (message.type === 'assignment') {
    return (
      <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-3">
        <p className="text-xs font-semibold text-violet-700 flex items-center gap-1 mb-1">
          <FontAwesomeIcon icon={faClipboardList} />
          {t('groupsPage.messageTypes.assignment', { title: meta.assignment_title })}
        </p>
        <p className="text-sm">{message.content}</p>
        {meta.course_name && <p className="text-xs text-surface-500 mt-1">{meta.course_name}</p>}
      </div>
    );
  }

  if (message.type === 'file') {
    return (
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3 text-sm">
        <p className="font-medium">{message.file_name}</p>
        <p className="text-xs text-surface-500">{message.content}</p>
      </div>
    );
  }

  return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
}

export default function GroupChat({
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  canSend,
}) {
  const { t } = useTranslation();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim() || sending || !canSend) return;
    onSend(draft.trim());
  };

  return (
    <div className="flex flex-col h-full min-h-[360px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-surface-500 text-center py-8">{t('groupsPage.noMessagesYet')}</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <Avatar src={m.user?.avatar_url} name={m.user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-medium">{m.user?.name}</span>
                <span className="text-xs text-surface-500">{formatTime(m.created_at)}</span>
              </div>
              <MessageBubble message={m} />
            </div>
          </div>
        ))}
        {sending && (
          <p className="text-sm text-surface-500 flex items-center gap-2">
            <FontAwesomeIcon icon={faSpinner} spin />
            {t('groupsPage.sending')}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {canSend ? (
        <form onSubmit={handleSubmit} className="p-4 border-t border-surface-200 dark:border-surface-700 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={t('groupsPage.typeMessage')}
            className="flex-1 rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={sending || !draft.trim()}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </Button>
        </form>
      ) : (
        <p className="p-4 text-xs text-surface-500 border-t border-surface-200 dark:border-surface-700">
          {t('groupsPage.noSendPermission')}
        </p>
      )}
    </div>
  );
}
