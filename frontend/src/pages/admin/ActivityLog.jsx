import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faFilterCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { activityLogsAPI } from '../../services/api';
import { PageHeader, Card, SearchBar, Select, Pagination, Avatar, Badge } from '../../components/common/UI';

function actionColor(action = '') {
  if (action.includes('delete') || action.includes('logout')) return 'danger';
  if (action.includes('create') || action.includes('login')) return 'success';
  if (action.includes('update') || action.includes('grade')) return 'info';
  return 'gray';
}

export default function ActivityLog() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debounced, actionFilter]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await activityLogsAPI.list({
        page,
        per_page: 20,
        ...(debounced && { search: debounced }),
        ...(actionFilter && { action: actionFilter }),
      });
      setLogs(data.data ?? []);
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      });
    } catch {
      toast.error(t('adminPages.activityLog.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, debounced, actionFilter, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('nav.activityLog')}
        subtitle={t('adminPages.activityLog.subtitle')}
      />

      <Card padding={false}>
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-surface-100 dark:border-surface-800">
          <SearchBar value={search} onChange={setSearch} placeholder={t('adminPages.activityLog.searchPlaceholder')} className="sm:flex-1" />
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="sm:w-48">
            <option value="">{t('adminPages.activityLog.allActions')}</option>
            <option value="student">{t('adminPages.activityLog.filterStudent')}</option>
            <option value="teacher">{t('adminPages.activityLog.filterTeacher')}</option>
            <option value="grade">{t('adminPages.activityLog.filterGrade')}</option>
            <option value="login">{t('adminPages.activityLog.filterLogin')}</option>
            <option value="logout">{t('adminPages.activityLog.filterLogout')}</option>
          </Select>
          {(search || actionFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setActionFilter(''); }}
              className="text-sm text-surface-500 hover:text-primary-500 flex items-center gap-1 px-2"
            >
              <FontAwesomeIcon icon={faFilterCircleXmark} /> {t('adminPages.activityLog.resetFilters')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-surface-400">
            <FontAwesomeIcon icon={faHistory} className="w-8 h-8 mb-3 opacity-40" />
            <p>{t('adminPages.activityLog.empty')}</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative border-l-2 border-primary-500/30 ml-4 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-8">
                  <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-primary-500 ring-4 ring-white dark:ring-surface-900" />
                  <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar src={log.user?.avatar_url} name={log.user?.name} size="xs" />
                        <span className="text-sm font-medium text-surface-900 dark:text-white">{log.user?.name ?? t('adminPages.activityLog.system')}</span>
                        <Badge color={actionColor(log.action)} size="xs">{log.action}</Badge>
                      </div>
                      <span className="text-xs text-surface-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-surface-600 dark:text-surface-400">{log.description}</p>
                    {log.ip_address && (
                      <p className="text-xs text-surface-400 mt-1">{t('adminPages.activityLog.ipAddress', { address: log.ip_address })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>
    </div>
  );
}
