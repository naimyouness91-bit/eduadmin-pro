import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faChalkboardTeacher,
  faArrowRight,
  faBell,
  faUserPlus,
  faChartBar,
  faTrophy,
  faCalendarCheck,
  faEnvelope,
  faRotateLeft,
  faCalendarDays,
  faBook,
  faClipboardCheck,
  faListCheck,
} from '@fortawesome/free-solid-svg-icons';
import { Line, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { StatCard, Card, Badge, Avatar } from '../common/UI';
import DashboardWidgetGrid from './DashboardWidgetGrid';
import ScheduleDashboardWidgets from '../schedule/ScheduleDashboardWidgets';
import { ADMIN_WIDGET_META } from '../../config/dashboardWidgets';
import { useDashboardLayout } from '../../hooks/useDashboardLayout';

function ChartSkeleton({ tall }) {
  return (
    <div className={`chart-responsive ${tall ? 'lg:h-72' : ''} bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse`} />
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-surface-200 dark:bg-surface-700 rounded-lg" />
        <div className="h-4 w-48 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
    </div>
  );
}

export default function AdminDashboardWidgets({
  data,
  loading,
  user,
  canManageStudents,
  greetingText,
  appLocale,
  attendanceRate,
  lineChartData,
  lineOptions,
  doughnutData,
  doughnutOptions,
  formatChartDate,
  formatTimestamp,
  actionBadgeColor,
}) {
  const { t } = useTranslation();
  const { order, setOrder, resetLayout } = useDashboardLayout();
  const stats = data?.stats;
  const firstName = user?.name?.split(' ')[0] || 'there';

  const getWidgetLabel = useCallback(
    (id) => t(ADMIN_WIDGET_META[id]?.labelKey ?? id),
    [t]
  );

  const onResetLayout = () => {
    resetLayout();
    toast.success(t('dashboard.layoutReset'));
  };

  const renderWidget = useCallback(
    (widgetId) => {
      switch (widgetId) {
        case 'total_students':
          return (
            <StatCard
              title={t('dashboard.totalStudents')}
              value={stats?.total_students ?? '—'}
              icon={faUsers}
              color="primary"
              trend={12}
              trendLabel={t('dashboard.vsLastMonth')}
              loading={loading}
              index={0}
            />
          );
        case 'total_teachers':
          return (
            <StatCard
              title={t('dashboard.teachers')}
              value={stats?.total_teachers ?? '—'}
              icon={faChalkboardTeacher}
              color="success"
              loading={loading}
              subtitle={t('dashboard.activeEducators')}
              index={1}
            />
          );
        case 'attendance':
          return (
            <Card
              title={t('dashboard.attendanceTrend')}
              subtitle={t('dashboard.last30Days')}
              className="h-full flex flex-col"
            >
              {loading ? (
                <ChartSkeleton tall />
              ) : (
                <>
                  <div className="chart-responsive">
                    <Line data={lineChartData} options={lineOptions} />
                  </div>
                  <div className="flex items-center gap-6 mt-4">
                    {[
                      [t('common.present'), '#22c55e'],
                      [t('common.absent'), '#ef4444'],
                    ].map(([label, color]) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          );
        case 'grades':
          return (
            <Card
              title={t('dashboard.gradeDistribution')}
              subtitle={t('dashboard.currentSemester')}
              className="h-full flex flex-col"
            >
              {loading ? (
                <ChartSkeleton />
              ) : (
                <div className="chart-responsive flex items-center justify-center">
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              )}
            </Card>
          );
        case 'notifications':
          return (
            <Card
              title={t('dashboard.notifications')}
              subtitle={t('dashboard.latestUpdates')}
              padding={false}
              className="h-full flex flex-col"
            >
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-surface-100 dark:divide-surface-800">
                  {data?.announcements?.length ? (
                    data.announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="flex items-start gap-3 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <FontAwesomeIcon icon={faBell} className="text-primary-500 w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-800 dark:text-surface-200 line-clamp-1">
                            {ann.title}
                          </p>
                          <p className="text-xs text-surface-400 mt-0.5">
                            {formatChartDate(ann.published_at || ann.created_at, appLocale)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-surface-400 text-center py-8">{t('common.noAnnouncements')}</p>
                  )}
                </div>
              )}
              <div className="p-3 border-t border-surface-100 dark:border-surface-800">
                <Link
                  to="/announcements"
                  className="flex items-center justify-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium py-1"
                >
                  {t('common.viewAllLink')}
                  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 rtl-mirror" />
                </Link>
              </div>
            </Card>
          );
        case 'calendar':
          return (
            <Card
              title={t('dashboard.upcomingEvents')}
              subtitle={t('nav.calendar')}
              padding={false}
              className="h-full flex flex-col"
            >
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : data?.upcoming_events?.length ? (
                <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                  {data.upcoming_events.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-3 p-4">
                      <div className="w-9 h-9 rounded-xl bg-info-500/10 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faCalendarDays} className="text-info-500 w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                          {ev.title}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {formatChartDate(ev.start_date, appLocale)}
                          {ev.type ? ` · ${ev.type}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-surface-400 text-center py-8">{t('dashboard.noUpcomingEvents')}</p>
              )}
              <div className="p-3 border-t border-surface-100 dark:border-surface-800">
                <Link
                  to="/events"
                  className="flex items-center justify-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium py-1"
                >
                  {t('nav.calendar')}
                  <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 rtl-mirror" />
                </Link>
              </div>
            </Card>
          );
        case 'activity_timeline':
          return (
            <Card
              title={t('dashboard.recentActivity')}
              subtitle={t('dashboard.systemEvents')}
              padding={false}
              className="h-full flex flex-col"
            >
              <div className="p-6 space-y-1 max-h-72 overflow-y-auto">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                      <div className="w-9 h-9 rounded-xl bg-surface-200 dark:bg-surface-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-4/5" />
                        <div className="h-2.5 bg-surface-200 dark:bg-surface-700 rounded w-1/3" />
                      </div>
                    </div>
                  ))
                ) : data?.recent_activities?.length ? (
                  data.recent_activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 py-2.5 border-b border-surface-100 dark:border-surface-800 last:border-0"
                    >
                      <Avatar src={activity.user?.avatar_url} name={activity.user?.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-700 dark:text-surface-300">
                          <span className="font-medium text-surface-900 dark:text-white">
                            {activity.user?.name || 'System'}
                          </span>{' '}
                          {activity.description}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {formatTimestamp(activity.created_at)}
                        </p>
                      </div>
                      <Badge color={actionBadgeColor(activity.action)} size="xs">
                        {activity.action?.split('.').pop() || 'event'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-surface-400 text-center py-8">{t('common.noActivity')}</p>
                )}
              </div>
            </Card>
          );
        default:
          return null;
      }
    },
    [
      t,
      stats,
      loading,
      attendanceRate,
      lineChartData,
      lineOptions,
      doughnutData,
      doughnutOptions,
      data,
      appLocale,
      formatChartDate,
      formatTimestamp,
      actionBadgeColor,
    ]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {loading ? (
        <HeaderSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-surface-900 dark:text-white">
              {greetingText},{' '}
              <span className="text-primary-500">{firstName}</span> 👋
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              {new Date().toLocaleDateString(appLocale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResetLayout}
              title={t('dashboard.resetLayout')}
              className="p-2 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
              <span className="sr-only">{t('dashboard.resetLayout')}</span>
            </button>
            {canManageStudents && (
              <Link
                to="/students"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors shadow-glow"
              >
                <FontAwesomeIcon icon={faUserPlus} className="w-4 h-4" />
                {t('dashboard.addStudent')}
              </Link>
            )}
          </div>
        </div>
      )}

      <ScheduleDashboardWidgets />

      <DashboardWidgetGrid
        order={order}
        onOrderChange={setOrder}
        renderWidget={renderWidget}
        getWidgetLabel={getWidgetLabel}
        fixedKpiSlot={
          <>
            <StatCard
              title={t('dashboard.activeCourses')}
              value={stats?.total_courses ?? '—'}
              icon={faBook}
              color="warning"
              loading={loading}
              subtitle={t('dashboard.acrossDepartments')}
            />
            <StatCard
              title={t('dashboard.attendanceRate')}
              value={attendanceRate != null ? `${attendanceRate}%` : '—'}
              icon={faClipboardCheck}
              color="info"
              trend={2.1}
              trendLabel={t('dashboard.vsLastWeek')}
              loading={loading}
            />
          </>
        }
        quickActionsSlot={
          <Card title={t('dashboard.quickActions')} className="h-full flex flex-col">
            {loading ? (
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                {[
                  {
                    label: t('dashboard.actionAttendance'),
                    icon: faCalendarCheck,
                    path: '/attendance',
                    color:
                      'bg-success-500/10 text-success-600 dark:text-success-400 hover:bg-success-500/20',
                  },
                  {
                    label: t('dashboard.actionGrade'),
                    icon: faTrophy,
                    path: '/grades',
                    color:
                      'bg-warning-500/10 text-warning-600 dark:text-warning-400 hover:bg-warning-500/20',
                  },
                  {
                    label: t('dashboard.actionReports'),
                    icon: faChartBar,
                    path: '/analytics',
                    color: 'bg-info-500/10 text-info-600 dark:text-info-400 hover:bg-info-500/20',
                  },
                  {
                    label: t('dashboard.actionMessage'),
                    icon: faEnvelope,
                    path: '/messages',
                    color:
                      'bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20',
                  },
                ].map((action) => (
                  <Link
                    key={action.label}
                    to={action.path}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-medium text-xs transition-all hover:scale-[1.02] ${action.color}`}
                  >
                    <FontAwesomeIcon icon={action.icon} className="w-5 h-5" />
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        }
        recentTasksSlot={
          <Card
            title={t('dashboard.recentTasks')}
            subtitle={t('dashboard.systemEvents')}
            padding={false}
            className="h-full flex flex-col"
          >
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-surface-100 dark:bg-surface-800 rounded-lg animate-pulse" />
                ))
              ) : data?.recent_activities?.length ? (
                data.recent_activities.slice(0, 4).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-50/80 dark:bg-surface-800/50 border border-surface-100 dark:border-surface-800"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faListCheck} className="w-3.5 h-3.5 text-primary-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-surface-800 dark:text-surface-200 truncate">
                        {activity.description}
                      </p>
                      <p className="text-[10px] text-surface-400 mt-0.5">
                        {formatTimestamp(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-surface-400 text-center py-6">{t('dashboard.noRecentTasks')}</p>
              )}
            </div>
          </Card>
        }
      />
    </div>
  );
}
