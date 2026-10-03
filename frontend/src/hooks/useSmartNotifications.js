import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsAPI } from '../services/api';
import { normalizeNotification } from '../utils/notifications';

const POLL_INTERVAL_MS = 8000;

export function useSmartNotifications({ enabled = true, listLimit = 10 } = {}) {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [countRes, listRes] = await Promise.all([
        notificationsAPI.unreadCount(),
        notificationsAPI.list({ per_page: listLimit }),
      ]);
      if (!mountedRef.current) return;
      const rows = (listRes.data.data ?? []).map(normalizeNotification);
      setCount(countRes.data.count ?? 0);
      setItems(rows);
    } catch {
      /* silent — bell stays usable */
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled, listLimit]);

  const markRead = useCallback(async (id) => {
    await notificationsAPI.markRead(id);
    await refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await notificationsAPI.markAllRead();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();

    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { count, items, loading, refresh, markRead, markAllRead };
}
