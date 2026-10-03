import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faComments } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '../common/UI';

const TYPE_COLORS = {
  student: 'blue',
  teacher: 'purple',
  mixed: 'green',
  course: 'primary',
  announcement: 'amber',
};

export default function GroupCard({ group }) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-4 hover:border-primary-400 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display font-semibold text-surface-900 dark:text-white line-clamp-1">
          {group.name}
        </h3>
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          {group.audience && group.audience !== 'custom' && (
            <Badge color="green" size="sm">
              {t(`groupsPage.audience.${group.audience}`, { defaultValue: group.audience })}
            </Badge>
          )}
          <Badge color={TYPE_COLORS[group.type] || 'gray'} size="sm">
            {t(`groupsPage.types.${group.type}`, { defaultValue: group.type })}
          </Badge>
        </div>
      </div>
      {group.description && (
        <p className="text-sm text-surface-500 line-clamp-2 mb-3">{group.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-surface-500">
        <span className="flex items-center gap-1">
          <FontAwesomeIcon icon={faUsers} />
          {t('groupsPage.membersCount', { count: group.members_count ?? 0 })}
        </span>
        <span className="flex items-center gap-1">
          <FontAwesomeIcon icon={faComments} />
          {t('groupsPage.postsCount', { count: group.messages_count ?? 0 })}
        </span>
      </div>
      {group.course && (
        <p className="text-xs text-primary-600 mt-2">{group.course.name}</p>
      )}
    </Link>
  );
}
