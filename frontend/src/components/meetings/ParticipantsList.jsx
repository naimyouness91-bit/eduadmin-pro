import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHand } from '@fortawesome/free-solid-svg-icons';
import { Avatar } from '../common/UI';

export default function ParticipantsList({ participants, showHand = true }) {
  const { t } = useTranslation();

  if (!participants?.length) {
    return <p className="text-sm text-surface-500">{t('meetingsPage.noParticipantsYet')}</p>;
  }

  const sorted = [...participants].sort((a, b) => {
    if (a.hand_raised === b.hand_raised) return 0;
    return a.hand_raised ? -1 : 1;
  });

  return (
    <ul className="space-y-2 max-h-64 overflow-y-auto">
      {sorted.map((p) => (
        <li
          key={p.id}
          className={`flex items-center gap-2 p-2 rounded-xl ${
            p.hand_raised ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' : 'bg-surface-50 dark:bg-surface-800/50'
          }`}
        >
          <Avatar src={p.user?.avatar_url} name={p.user?.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.user?.name}</p>
            <p className="text-xs text-surface-500 capitalize">{p.role}</p>
          </div>
          {showHand && p.hand_raised && (
            <FontAwesomeIcon icon={faHand} className="text-amber-500 shrink-0" title={t('meetingsPage.handRaised')} />
          )}
        </li>
      ))}
    </ul>
  );
}
