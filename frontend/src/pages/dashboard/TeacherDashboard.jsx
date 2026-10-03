import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faUsers,
  faClipboardCheck,
  faTrophy,
  faCalendarDay,
  faArrowRight,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { dashboardAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { withTimeout, API_TIMEOUT_MS } from '../../utils/withTimeout';
import { StatCard, Card, Badge } from '../../components/common/UI';
import ScheduleDashboardWidgets from '../../components/schedule/ScheduleDashboardWidgets';
import {
  formatScheduleTime,
  getRoom,
  SCHEDULE_DAYS,
} from '../../utils/scheduleUtils';

function useDashboardGreeting() {
  const { t } = useTranslation();
  const h = new Date().getHours();
  if (h < 12) return t('dashboard.greetingMorning');
  if (h < 17) return t('dashboard.greetingAfternoon');
  return t('dashboard.greetingEvening');
}

function useAppLocale() {
  const { i18n } = useTranslation();
  if (i18n.language === 'ar') return 'ar-SA';
  if (i18n.language === 'fr') return 'fr-FR';
  return 'en-US';
}

function HeaderSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-8 w-64 bg-surface-200 dark:bg-surface-700 rounded-lg" />
      <div className="h-4 w-48 bg-surface-200 dark:bg-surface-700 rounded" />
    </div>
  );
}

function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
      ))}
    </div>
  );
}

function getClassSection(slot) {
  if (slot?.class_section?.label) return slot.class_section.label;
  const grade = slot?.class_section?.grade_level ?? slot?.course?.grade_level;
  const section = slot?.class_section?.section;
  if (grade && section) return `${grade} — ${section}`;
  return grade || '—';
}

function formatTimestamp(iso, locale) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function absenceBadgeColor(status) {
  if (status === 'present') return 'success';
  if (status === 'late') return 'warning';
  if (status === 'excused') return 'info';
  return 'danger';
}

function activityBadgeColor(action = '') {
  if (action.includes('delete')) return 'danger';
  if (action.includes('create') || action.includes('recorded')) return 'success';
  if (action.includes('update') || action.includes('grade')) return 'info';
  return 'gray';
}

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const greetingText = useDashboardGreeting();
  const appLocale = useAppLocale();
  const firstName = user?.name?.split(' ')[0] || t('roles.teacher');
  const roleLabel = t('roles.teacher');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, API_TIMEOUT_MS + 2000);

    withTimeout(dashboardAPI.get(), API_TIMEOUT_MS, 'Dashboard load timed out')
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => toast.error(t('dashboard.loadError')))
      .finally(() => {
        if (!cancelled) setLoading(false);
        window.clearTimeout(loadTimer);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, [t]);

  const stats = data?.stats ?? {};
  const sessions = useMemo(
    () => data?.timetable_sessions ?? [],
    [data?.timetable_sessions]
  );

  const recentCourses = data?.my_courses ?? [];
  const recentGrades = data?.recent_grades ?? [];
  const recentAbsences = data?.recent_absences ?? [];
  const recentActivities = data?.recent_activities ?? [];
  const pendingSubmissions = data?.pending_submissions ?? [];

  return (
    <div className="space-y-6">
      {loading ? (
        <HeaderSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl text-surface-900 dark:text-white">
              {greetingText},{' '}
              <span className="text-primary-500">{firstName}</span> 👋
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 capitalize">
              {roleLabel} ·{' '}
              {new Date().toLocaleDateString(appLocale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {data?.is_demo_enriched && (
            <Badge color="info">{t('dashboard.demoDataBadge')}</Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <StatCard key={i} title="" value="" loading />
          ))
        ) : (
          <>
            <StatCard
              title={t('dashboard.myCourses')}
              value={stats.courses_count ?? recentCourses.length ?? 0}
              icon={faBook}
              color="primary"
            />
            <StatCard
              title={t('dashboard.studentsFollowed')}
              value={stats.students_count ?? 0}
              icon={faUsers}
              color="info"
            />
            <StatCard
              title={t('dashboard.pendingSubmissions')}
              value={stats.pending_submissions_count ?? pendingSubmissions.length ?? 0}
              icon={faTrophy}
              color="warning"
            />
            <StatCard
              title={t('dashboard.todaySessions')}
              value={stats.today_sessions_count ?? data?.today_schedule?.length ?? 0}
              icon={faCalendarDay}
              color="success"
            />
            <StatCard
              title={t('dashboard.todaysAttendance')}
              value={stats.today_attendance_count ?? data?.today_attendance?.length ?? 0}
              icon={faClipboardCheck}
              color="primary"
            />
          </>
        )}
      </div>

      <ScheduleDashboardWidgets
        sessions={sessions}
        weeklyHours={data?.weekly_hours}
        weeklyTotalHours={data?.weekly_total_hours}
        externalLoading={loading}
        showClassDetails
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={t('dashboard.recentCourses')}
          actions={
            <Link to="/courses" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
              {t('dashboard.viewAll')}
              <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={4} />
          ) : recentCourses.length ? (
            <ul className="space-y-2">
              {recentCourses.slice(0, 5).map((course) => (
                <li
                  key={course.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-surface-200/70 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{course.name}</p>
                    <p className="text-xs text-surface-500">
                      {course.code} · {course.grade_level ?? '—'}
                    </p>
                  </div>
                  <span className="text-xs text-surface-400 shrink-0">
                    {course.students_count ?? '—'} {t('dashboard.studentsShort')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-500 py-6 text-center">{t('common.noDataFound')}</p>
          )}
        </Card>

        <Card
          title={t('dashboard.recentGrades')}
          actions={
            <Link to="/grades" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
              {t('dashboard.allGrades')}
              <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={4} />
          ) : recentGrades.length ? (
            <ul className="space-y-2">
              {recentGrades.slice(0, 5).map((grade) => (
                <li
                  key={grade.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-surface-200/70 dark:border-surface-700/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {grade.student?.user?.name ?? grade.title ?? '—'}
                    </p>
                    <p className="text-xs text-surface-500 truncate">
                      {grade.course?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary-500">
                      {grade.score}/{grade.max_score ?? 20}
                    </p>
                    <p className="text-[10px] text-surface-400">
                      {formatTimestamp(grade.graded_at, appLocale)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-500 py-6 text-center">{t('dashboard.noGradesYet')}</p>
          )}
        </Card>

        <Card
          title={t('dashboard.recentAbsences')}
          actions={
            <Link to="/attendance" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
              {t('nav.attendance')}
              <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={4} />
          ) : recentAbsences.length ? (
            <ul className="space-y-2">
              {recentAbsences.slice(0, 5).map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-surface-200/70 dark:border-surface-700/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {row.student?.user?.name ?? '—'}
                    </p>
                    <p className="text-xs text-surface-500 truncate">{row.course?.name ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <Badge color={absenceBadgeColor(row.status)} size="sm">
                      {t(`common.${row.status}`, { defaultValue: row.status })}
                    </Badge>
                    <p className="text-[10px] text-surface-400">
                      {row.date ? new Date(row.date).toLocaleDateString(appLocale) : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-500 py-6 text-center">{t('common.noDataFound')}</p>
          )}
        </Card>

        <Card title={t('dashboard.teacherRecentActivity')}>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : recentActivities.length ? (
            <ul className="space-y-2">
              {recentActivities.slice(0, 5).map((act) => (
                <li
                  key={act.id}
                  className="p-3 rounded-xl border border-surface-200/70 dark:border-surface-700/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      {act.description ?? act.action ?? '—'}
                    </p>
                    <Badge color={activityBadgeColor(act.action)} size="sm">
                      {act.action?.split('.')[0] ?? 'log'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-surface-400 mt-1 flex items-center gap-1">
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                    {formatTimestamp(act.created_at, appLocale)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-500 py-6 text-center">{t('common.noDataFound')}</p>
          )}
        </Card>
      </div>

      {!loading && pendingSubmissions.length > 0 && (
        <Card
          title={t('dashboard.pendingSubmissions')}
          subtitle={t('dashboard.pendingSubmissionsHint')}
          actions={
            <Link to="/assignments" className="text-xs text-primary-500 hover:underline">
              {t('nav.assignments')}
            </Link>
          }
        >
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pendingSubmissions.slice(0, 6).map((sub) => (
              <li
                key={sub.id}
                className="p-3 rounded-xl border border-surface-200/70 dark:border-surface-700/50 text-sm"
              >
                <p className="font-medium truncate">{sub.assignment?.title ?? '—'}</p>
                <p className="text-xs text-surface-500 truncate">
                  {sub.student?.user?.name ?? '—'} · {sub.assignment?.course?.name ?? '—'}
                </p>
                <p className="text-[10px] text-surface-400 mt-1">
                  {formatTimestamp(sub.submitted_at, appLocale)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
