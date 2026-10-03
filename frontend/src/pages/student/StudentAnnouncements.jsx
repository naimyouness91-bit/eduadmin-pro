import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { announcementsAPI } from '../../services/api';
import { timeAgo } from '../../utils/timeAgo';
import { GlassCard, StudentEmptyState, StudentPageShell } from '../../components/student/StudentUI';
import { Avatar, Badge } from '../../components/common/UI';

const READ_KEY = 'eduadmin-read-announcements';

function loadReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveReadIds(set) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export default function StudentAnnouncements() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [readIds, setReadIds] = useState(loadReadIds);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await announcementsAPI.list({ per_page: 100 });
      setAnnouncements(data.data ?? []);
    } catch {
      toast.error(t('studentPages.loadAnnouncementsFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return announcements;
    return announcements.filter(
      (a) => a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q)
    );
  }, [announcements, search]);

  const unreadCount = useMemo(
    () => filtered.filter((a) => !readIds.has(String(a.id))).length,
    [filtered, readIds]
  );

  const markRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      saveReadIds(next);
      return next;
    });
  };

  const toggleExpand = (id) => {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
    markRead(id);
  };

  const subtitle = unreadCount > 0
    ? t('studentPages.unreadUpdates', { count: unreadCount })
    : t('studentPages.announcementsSubtitleDefault');

  return (
    <StudentPageShell
      title={t('studentPages.announcementsTitle')}
      subtitle={subtitle}
      actions={unreadCount > 0 ? <Badge color="warning">{t('studentPages.newBadge', { count: unreadCount })}</Badge> : null}
    >
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('studentPages.searchAnnouncements')}
        className="w-full max-w-3xl mb-4 px-4 py-3 rounded-xl bg-white/70 dark:bg-surface-900/60 backdrop-blur border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />

      {loading ? (
        <div className="space-y-4 max-w-3xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="space-y-4 max-w-3xl">
          {filtered.map((ann) => {
            const isRead = readIds.has(String(ann.id));
            const isOpen = expanded[ann.id];
            return (
              <GlassCard key={ann.id} hover className={!isRead ? 'ring-1 ring-primary-500/30' : ''}>
                <button type="button" onClick={() => toggleExpand(ann.id)} className="w-full text-left">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/15 text-primary-500 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faBullhorn} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-surface-900 dark:text-white">{ann.title}</h3>
                        {!isRead && <Badge color="primary" size="xs">{t('studentPages.announcementNew')}</Badge>}
                      </div>
                      <p className="text-xs text-surface-500">{timeAgo(ann.published_at ?? ann.created_at)}</p>
                      <p className={`text-sm text-surface-600 dark:text-surface-300 mt-2 ${isOpen ? '' : 'line-clamp-2'}`}>
                        {ann.content}
                      </p>
                    </div>
                    <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="w-4 h-4 text-surface-400 mt-1 shrink-0" />
                  </div>
                </button>
                {isOpen && ann.creator && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-200/60 dark:border-surface-700/50">
                    <Avatar src={ann.creator.avatar_url} name={ann.creator.name} className="!w-7 !h-7" />
                    <span className="text-xs text-surface-500">{t('studentPages.postedBy', { name: ann.creator.name })}</span>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <StudentEmptyState icon={faBullhorn} title={t('common.noAnnouncements')} description={t('studentPages.noAnnouncementsHint')} />
      )}
    </StudentPageShell>
  );
}
