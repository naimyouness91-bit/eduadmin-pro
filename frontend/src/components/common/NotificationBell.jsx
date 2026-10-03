import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheckDouble, faSpinner } from '@fortawesome/free-solid-svg-icons';
import FloatingMenu from './FloatingMenu';
import { useSmartNotifications } from '../../hooks/useSmartNotifications';
import { useAuthStore } from '../../store';
import {
  NOTIFICATION_CATEGORIES,
  formatTimeAgo,
  resolveNotificationRoute,
} from '../../utils/notifications';

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { count, items, loading, refresh, markRead, markAllRead } = useSmartNotifications({
    enabled: true,
    listLimit: 12,
  });

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  };

  const handleSelect = async (notification) => {
    if (!notification.read_at) {
      await markRead(notification.id);
    }
    navigate(resolveNotificationRoute(notification, user?.role));
    setOpen(false);
  };

  const handleMarkAll = async () => {
    await markAllRead();
  };

  const ariaLabel = count > 0
    ? t('notificationsPage.ariaLabelUnread', { count })
    : t('notificationsPage.ariaLabel');

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2.5 rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 active:scale-95"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
      >
        <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
        {count > 0 && (
          <span className="notify-badge-corner absolute top-1 end-1 min-w-[18px] h-[18px] px-1 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {count > 99 ? '99+' : count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <FloatingMenu
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        preferAbove
        widthClass="w-96"
        className="!min-w-[20rem]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100/80 dark:border-surface-800/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-surface-900 dark:text-white">{t('notificationsPage.title')}</span>
            {count > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-500/15 text-danger-600 dark:text-danger-400">
                {t('notificationsPage.newCount', { count })}
              </span>
            )}
            {loading && <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin text-surface-400" />}
          </div>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={count === 0}
            className="text-xs text-primary-500 hover:text-primary-600 disabled:opacity-40 flex items-center gap-1 transition-colors"
          >
            <FontAwesomeIcon icon={faCheckDouble} className="w-3 h-3" /> {t('notificationsPage.markAllRead')}
          </button>
        </div>

        <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-surface-100/60 dark:border-surface-800/60">
          {Object.entries(NOTIFICATION_CATEGORIES).map(([key, cfg]) => (
            <span key={key} className="inline-flex items-center gap-1 text-[10px] text-surface-500">
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {t(`notificationsPage.categories.${key}`, { defaultValue: cfg.label })}
            </span>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-surface-400 text-center">{t('notificationsPage.noNotifications')}</p>
          ) : (
            items.map((n) => {
              const cfg = NOTIFICATION_CATEGORIES[n.category] ?? NOTIFICATION_CATEGORIES.system;
              const unread = !n.read_at;
              const categoryLabel = n.category_label ?? t(`notificationsPage.categories.${n.category}`, { defaultValue: cfg.label });

              return (
                <button
                  key={n.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(n)}
                  className={`w-full text-start px-4 py-3 hover:bg-primary-500/10 dark:hover:bg-primary-500/10 transition-colors duration-150 flex gap-3 ${
                    unread ? 'bg-primary-500/5' : ''
                  }`}
                >
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                    <FontAwesomeIcon icon={cfg.icon} className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${unread ? 'text-surface-900 dark:text-white' : 'text-surface-700 dark:text-surface-300'}`}>
                        {n.title}
                      </p>
                      {unread && <span className="shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-1.5" />}
                    </div>
                    <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wide mt-0.5">
                      {categoryLabel}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-surface-400 mt-1">{formatTimeAgo(n.created_at)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </FloatingMenu>
    </div>
  );
}
