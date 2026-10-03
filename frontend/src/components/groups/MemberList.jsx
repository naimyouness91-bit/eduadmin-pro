import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserMinus, faCrown } from '@fortawesome/free-solid-svg-icons';
import { Avatar, Button } from '../common/UI';

export default function MemberList({ members, canManage, onRemove }) {
  const { t } = useTranslation();

  if (!members?.length) {
    return <p className="text-sm text-surface-500">{t('groupsPage.noMembersYet')}</p>;
  }

  return (
    <ul className="space-y-2 max-h-80 overflow-y-auto">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-50 dark:bg-surface-800/50"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar src={m.user?.avatar_url} name={m.user?.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{m.user?.name}</p>
              <p className="text-xs text-surface-500 capitalize">
                {m.role}
                {m.user?.role ? ` · ${t(`roles.${m.user.role}`, { defaultValue: m.user.role })}` : ''}
              </p>
            </div>
            {m.role === 'owner' && (
              <FontAwesomeIcon icon={faCrown} className="text-amber-500 text-xs shrink-0" title={t('groupsPage.owner')} />
            )}
          </div>
          {canManage && m.role !== 'owner' && onRemove && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(m.user?.id)}
              title={t('groupsPage.removeMember')}
            >
              <FontAwesomeIcon icon={faUserMinus} />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
