import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRightToBracket,
  faTriangleExclamation,
  faDesktop,
  faMobileScreen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { securityAPI } from '../../services/api';
import {
  PageHeader,
  Card,
  SearchBar,
  Select,
  Pagination,
  Badge,
  Button,
  Avatar,
} from '../../components/common/UI';
import MiniStatCard from '../../components/common/MiniStatCard';
import { timeAgo } from '../../utils/timeAgo';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function SecurityCenter() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('timeline');
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const TABS = useMemo(
    () => [
      { id: 'timeline', label: t('adminPages.securityCenter.tabTimeline') },
      { id: 'logins', label: t('adminPages.securityCenter.tabLogins') },
      { id: 'failed', label: t('adminPages.securityCenter.tabFailed') },
      { id: 'sessions', label: t('adminPages.securityCenter.tabSessions') },
      { id: 'devices', label: t('adminPages.securityCenter.tabDevices') },
      { id: 'last', label: t('adminPages.securityCenter.tabLastLogin') },
      { id: 'activity', label: t('adminPages.securityCenter.tabActivity') },
    ],
    [t],
  );

  const failureLabel = useCallback(
    (reason) => {
      const map = {
        invalid_credentials: t('adminPages.securityCenter.failureInvalidCredentials'),
        invalid_password: t('adminPages.securityCenter.failureInvalidPassword'),
        account_deactivated: t('adminPages.securityCenter.failureAccountDeactivated'),
        account_inactive: t('adminPages.securityCenter.failureAccountInactive'),
        invalid_2fa_code: t('adminPages.securityCenter.failureInvalid2fa'),
      };
      return map[reason] || reason || t('adminPages.securityCenter.failureUnknown');
    },
    [t],
  );

  const filters = {
    page,
    per_page: 15,
    ...(search && { search }),
    ...(roleFilter && { role: roleFilter }),
    ...(categoryFilter && { category: categoryFilter }),
    ...(fromDate && { from: fromDate }),
    ...(toDate && { to: toDate }),
  };

  const loadOverview = useCallback(async () => {
    try {
      const { data } = await securityAPI.overview();
      setOverview(data.data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadTab = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'logins') res = await securityAPI.loginHistory(filters);
      else if (tab === 'failed') res = await securityAPI.failedAttempts(filters);
      else if (tab === 'sessions') res = await securityAPI.sessions(filters);
      else if (tab === 'devices') {
        const { data } = await securityAPI.devices(filters);
        setItems(data.data ?? []);
        setMeta(null);
        setLoading(false);
        return;
      } else if (tab === 'last') res = await securityAPI.lastLogins(filters);
      else if (tab === 'activity') res = await securityAPI.activity(filters);
      else if (tab === 'timeline') {
        const [logins, failed] = await Promise.all([
          securityAPI.loginHistory({ per_page: 8 }),
          securityAPI.failedAttempts({ per_page: 5 }),
        ]);
        const merged = [
          ...(logins.data.data ?? []).map((e) => ({ ...e, _kind: 'login' })),
          ...(failed.data.data ?? []).map((e) => ({ ...e, _kind: 'failed' })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setItems(merged.slice(0, 12));
        setMeta(null);
        setLoading(false);
        return;
      }
      setItems(res.data.data ?? []);
      setMeta({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        from: res.data.from,
        to: res.data.to,
        total: res.data.total,
      });
    } catch {
      toast.error(t('adminPages.securityCenter.loadFailed'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, roleFilter, categoryFilter, fromDate, toDate, t]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, roleFilter, categoryFilter, fromDate, toDate]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  const revokeSession = async (id) => {
    try {
      await securityAPI.revokeSession(id);
      toast.success(t('adminPages.securityCenter.sessionRevoked'));
      loadTab();
      loadOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || t('adminPages.securityCenter.revokeFailed'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('nav.security')}
        subtitle={t('adminPages.securityCenter.subtitle')}
      />

      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStatCard
            title={t('adminPages.securityCenter.failedToday')}
            value={overview.failed_logins_today}
            icon={faTriangleExclamation}
            color="warning"
          />
          <MiniStatCard
            title={t('adminPages.securityCenter.loginsToday')}
            value={overview.successful_logins_today}
            icon={faRightToBracket}
            color="success"
          />
          <MiniStatCard
            title={t('adminPages.securityCenter.activeSessions')}
            value={overview.active_sessions}
            icon={faDesktop}
            color="primary"
          />
          <MiniStatCard
            title={t('adminPages.securityCenter.connectedDevices')}
            value={overview.unique_devices}
            icon={faMobileScreen}
            color="info"
          />
        </div>
      )}

      <Card padding={false}>
        <div className="p-4 border-b border-surface-100 dark:border-surface-800 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === item.id
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col lg:flex-row gap-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('adminPages.securityCenter.searchPlaceholder')}
              className="flex-1"
            />
            {(tab === 'last' || tab === 'activity') && (
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="lg:w-40">
                <option value="">{t('adminPages.securityCenter.allRoles')}</option>
                <option value="admin">{t('roles.admin')}</option>
                <option value="teacher">{t('roles.teacher')}</option>
                <option value="student">{t('roles.student')}</option>
                <option value="parent">{t('roles.parent')}</option>
              </Select>
            )}
            {tab === 'activity' && (
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="lg:w-40">
                <option value="">{t('adminPages.securityCenter.allCategories')}</option>
                <option value="auth">{t('adminPages.securityCenter.categoryAuth')}</option>
                <option value="account">{t('adminPages.securityCenter.categoryAccount')}</option>
              </Select>
            )}
            {(tab === 'logins' || tab === 'failed' || tab === 'activity') && (
              <>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm"
                />
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-center text-surface-500 py-12">{t('common.loading')}</p>
          ) : items.length === 0 ? (
            <p className="text-center text-surface-500 py-12">{t('adminPages.securityCenter.empty')}</p>
          ) : tab === 'timeline' ? (
            <div className="relative border-s border-surface-200 dark:border-surface-700 ms-3 space-y-6">
              {items.map((e) => (
                <div key={`${e._kind}-${e.id}`} className="relative ps-6">
                  <span
                    className={`absolute -start-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-surface-900 ${
                      e._kind === 'failed' ? 'bg-danger-500' : 'bg-success-500'
                    }`}
                  />
                  <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-3 bg-surface-50/50 dark:bg-surface-800/30">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge color={e._kind === 'failed' ? 'danger' : 'success'} size="xs">
                        {e._kind === 'failed' ? t('adminPages.securityCenter.failedLogin') : t('adminPages.securityCenter.successfulLogin')}
                      </Badge>
                      <span className="text-xs text-surface-500">{timeAgo(e.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {e.user?.name || e.email}
                    </p>
                    <p className="text-xs text-surface-500">
                      {e.ip_address} · {e.browser || '—'} · {e.platform || '—'}
                      {e._kind === 'failed' && ` · ${failureLabel(e.failure_reason)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'sessions' ? (
            <div className="space-y-3">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                      <FontAwesomeIcon icon={faDesktop} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.user_name}</p>
                      <p className="text-xs text-surface-500">
                        {s.device_name} · {t('adminPages.securityCenter.lastUsed', { date: formatDate(s.last_used_at) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.is_current && <Badge color="primary" size="xs">{t('adminPages.securityCenter.currentSession')}</Badge>}
                    {!s.is_current && (
                      <Button size="sm" variant="outline" className="text-danger-500" onClick={() => revokeSession(s.id)}>
                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : tab === 'devices' ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((d, i) => (
                <div key={i} className="p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon
                      icon={d.device_type === 'mobile' ? faMobileScreen : faDesktop}
                      className="text-primary-500"
                    />
                    <span className="font-medium text-sm">{d.user_name || d.user_email}</span>
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">{d.device_name}</p>
                  <p className="text-xs text-surface-500 mt-1">
                    {[d.browser, d.platform].filter(Boolean).join(' · ') || t('adminPages.securityCenter.sessionDevice')}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">{t('adminPages.securityCenter.lastSeen', { date: formatDate(d.last_seen_at) })}</p>
                </div>
              ))}
            </div>
          ) : tab === 'last' ? (
            <div className="responsive-table-wrap scroll-hint-x">
              <table className="w-full text-sm">
                <thead className="text-surface-500 border-b border-surface-200 dark:border-surface-700">
                  <tr>
                    <th className="text-start py-2">{t('adminPages.securityCenter.colUser')}</th>
                    <th className="text-start py-2">{t('adminPages.securityCenter.colRole')}</th>
                    <th className="text-start py-2">{t('adminPages.securityCenter.colLastLogin')}</th>
                    <th className="text-end py-2">{t('adminPages.securityCenter.colStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {items.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} size="sm" />
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-surface-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 capitalize">{u.role?.replace('_', ' ')}</td>
                      <td className="py-3">{formatDate(u.last_login_at)}</td>
                      <td className="py-3 text-end">
                        <Badge color={u.is_active ? 'success' : 'danger'} size="xs">
                          {u.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tab === 'activity' ? (
            <div className="space-y-3">
              {items.map((log) => (
                <div key={log.id} className="flex gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700">
                  <Avatar name={log.user?.name || '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-medium text-sm">{log.user?.name || t('adminPages.activityLog.system')}</span>
                      <Badge color="gray" size="xs">{log.action_label || log.action}</Badge>
                      <span className="text-xs text-surface-500">{timeAgo(log.created_at)}</span>
                    </div>
                    <p className="text-sm text-surface-600 dark:text-surface-400 mt-0.5">{log.description}</p>
                    {log.ip_address && (
                      <p className="text-xs text-surface-500 mt-1">{t('adminPages.activityLog.ipAddress', { address: log.ip_address })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="responsive-table-wrap scroll-hint-x">
              <table className="w-full text-sm">
                <thead className="text-surface-500 border-b border-surface-200 dark:border-surface-700">
                  <tr>
                    <th className="text-start py-2">{t('adminPages.securityCenter.colUserEmail')}</th>
                    <th className="text-start py-2">{t('adminPages.securityCenter.colIp')}</th>
                    <th className="text-start py-2">{t('adminPages.securityCenter.colDevice')}</th>
                    <th className="text-start py-2">{t('adminPages.securityCenter.colWhen')}</th>
                    {tab === 'failed' && <th className="text-start py-2">{t('adminPages.securityCenter.colReason')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {items.map((e) => (
                    <tr key={e.id}>
                      <td className="py-3">
                        <p className="font-medium">{e.user?.name || '—'}</p>
                        <p className="text-xs text-surface-500">{e.email}</p>
                      </td>
                      <td className="py-3">{e.ip_address || '—'}</td>
                      <td className="py-3 text-xs">
                        {e.device_name}
                        <br />
                        <span className="text-surface-500">{e.browser} · {e.platform}</span>
                      </td>
                      <td className="py-3">{formatDate(e.created_at)}</td>
                      {tab === 'failed' && (
                        <td className="py-3">
                          <Badge color="danger" size="xs">{failureLabel(e.failure_reason)}</Badge>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.last_page > 1 && (
            <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
              <Pagination meta={meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
