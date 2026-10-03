import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Avatar, Button } from '../common/UI';
import { formatTime } from '../../utils/formatTime';

export default function MeetingChat({ messages, draft, onDraftChange, onSend, sending }) {
  const { t } = useTranslation();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    onSend(draft.trim());
  };

  return (
    <div className="flex flex-col h-full min-h-[280px]">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <Avatar src={m.user?.avatar_url} name={m.user?.name} size="sm" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium">{m.user?.name}</span>
                <span className="text-xs text-surface-500">{formatTime(m.created_at)}</span>
              </div>
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-surface-200 dark:border-surface-700 flex gap-2">
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t('groupsPage.typeMessage')}
          className="flex-1 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2"
        />
        <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
          <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </form>
    </div>
  );
}
