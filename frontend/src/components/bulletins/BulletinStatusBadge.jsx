import { useTranslation } from 'react-i18next';
import { Badge } from '../common/UI';

const STATUS_COLORS = {
  draft: 'gray',
  generated: 'warning',
  published: 'success',
};

export default function BulletinStatusBadge({ status, loading = false, size = 'sm' }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <span
        className="inline-block min-w-[4.5rem] h-6 rounded-full bg-surface-200 dark:bg-surface-700 animate-pulse"
        aria-hidden
      />
    );
  }

  const statusKey = status?.status || 'draft';

  return (
    <Badge color={STATUS_COLORS[statusKey] || 'gray'} size={size} dot>
      {t(`bulletin.status.${statusKey}`, { defaultValue: statusKey })}
    </Badge>
  );
}
