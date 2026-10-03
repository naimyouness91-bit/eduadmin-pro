import {
  faBell,
  faCalendarDays,
  faEnvelope,
  faExclamationTriangle,
  faStar,
  faUserClock,
} from '@fortawesome/free-solid-svg-icons';

export const NOTIFICATION_CATEGORIES = {
  attendance: {
    label: 'High absence',
    icon: faUserClock,
    color: 'text-danger-500 bg-danger-500/10',
    dot: 'bg-danger-500',
  },
  grade: {
    label: 'New grade',
    icon: faStar,
    color: 'text-warning-500 bg-warning-500/10',
    dot: 'bg-warning-500',
  },
  message: {
    label: 'New message',
    icon: faEnvelope,
    color: 'text-primary-500 bg-primary-500/10',
    dot: 'bg-primary-500',
  },
  event: {
    label: 'New event',
    icon: faCalendarDays,
    color: 'text-success-500 bg-success-500/10',
    dot: 'bg-success-500',
  },
  timetable: {
    label: 'Timetable',
    icon: faCalendarDays,
    color: 'text-violet-500 bg-violet-500/10',
    dot: 'bg-violet-500',
  },
  system: {
    label: 'System alert',
    icon: faExclamationTriangle,
    color: 'text-surface-600 bg-surface-500/10 dark:text-surface-300',
    dot: 'bg-surface-500',
  },
};

export function normalizeNotification(row) {
  if (row.category && row.title) {
    return {
      id: row.id,
      read_at: row.read_at,
      created_at: row.created_at,
      category: row.category,
      category_label: row.category_label,
      title: row.title,
      body: row.body ?? '',
      meta: row.meta ?? {},
    };
  }

  const data = row.data ?? row;

  return {
    id: row.id,
    read_at: row.read_at,
    created_at: row.created_at,
    category: data.category ?? 'system',
    category_label: data.category_label,
    title: data.title ?? 'Notification',
    body: data.body ?? '',
    meta: data.meta ?? {},
  };
}

export function resolveNotificationRoute(notification, role) {
  const { category, meta } = notification;
  switch (category) {
    case 'event':
      return '/events';
    case 'message':
      return '/messages';
    case 'grade':
      return '/grades';
    case 'attendance':
      return '/attendance';
    case 'timetable':
      return '/schedule';
    case 'system':
    default:
      return role === 'student' ? '/dashboard' : '/dashboard';
  }
}

export function formatTimeAgo(iso) {
  if (!iso) return '';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
