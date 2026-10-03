import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faClipboardCheck,
  faStar,
  faCalendarCheck,
  faBell,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { dashboardAPI, notificationsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { withTimeout, API_TIMEOUT_MS } from '../../utils/withTimeout';
import { StatCard, Card, Badge, GradeTag } from '../../components/common/UI';
import ScheduleDashboardWidgets from '../../components/schedule/ScheduleDashboardWidgets';

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

function WelcomeSkeleton() {
  return (
    <Card>
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-56 bg-surface-200 dark:bg-surface-700 rounded-lg" />
        <div className="h-4 w-40 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
    </Card>
  );
}

function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
      ))}
    </div>
  );
}

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const greetingText = useDashboardGreeting();
  const appLocale = useAppLocale();
  const firstName = user?.name?.split(' ')[0] || t('roles.student');
  const roleLabel = t('roles.student');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, API_TIMEOUT_MS + 2000);

    withTimeout(
      Promise.all([
        dashboardAPI.get(),
        notificationsAPI.unreadCount().catch(() => ({ data: { count: 0 } })),
      ]),
      API_TIMEOUT_MS,
      'Dashboard load timed out'
    )
      .then(([dash, notif]) => {
        if (cancelled) return;
        setData(dash.data);
        setUnread(notif.data?.count ?? 0);
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

  const gpa = useMemo(() => {
    const grades = data?.recent_grades ?? [];
    const scored = grades.filter((g) => g.score != null && g.max_score > 0);
    if (!scored.length) return null;
    const avg =
      scored.reduce((s, g) => s + (Number(g.score) / Number(g.max_score)) * 100, 0) / scored.length;
    return `${avg.toFixed(1)}%`;
  }, [data?.recent_grades]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(appLocale, { month: 'short', day: 'numeric' });
  };

  const recentGrades = data?.recent_grades ?? [];
  const assignments = data?.upcoming_assignments ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {loading ? (
        <WelcomeSkeleton />
      ) : (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display font-bold text-xl sm:text-2xl text-surface-900 dark:text-white">
                {greetingText},{' '}
                <span className="text-primary-500">{firstName}</span>{' '}
                <span className="inline-block origin-[70%_70%] animate-wave" aria-hidden>
                  👋
                </span>
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 capitalize">
                {roleLabel} ·{' '}
                {new Date().toLocaleDateString(appLocale, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-xs text-surface-400 mt-1">{t('dashboard.studentWelcomeSubtitle')}</p>
            </div>
            {unread > 0 && (
              <Link
                to="/messages"
                className="inline-flex items-center gap-2 shrink-0 self-start sm:self-center"
              >
                <Badge color="warning" size="sm" dot>
                  <FontAwesomeIcon icon={faBell} className="w-3 h-3 me-1" />
                  {t('dashboard.unreadMessages', { count: unread })}
                </Badge>
              </Link>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.overallAverage')}
          value={gpa ?? '—'}
          icon={faStar}
          color="warning"
          loading={loading}
        />
        <StatCard
          title={t('dashboard.attendanceRate')}
          value={
            data?.attendance_rate != null
              ? `${Number(data.attendance_rate).toFixed(1)}%`
              : '—'
          }
          icon={faClipboardCheck}
          color="success"
          loading={loading}
        />
        <StatCard
          title={t('dashboard.assignmentsDue')}
          value={assignments.length}
          icon={faCalendarCheck}
          color="info"
          loading={loading}
        />
        <StatCard
          title={t('dashboard.enrolledCourses')}
          value={data?.enrolled_courses?.length ?? 0}
          icon={faBook}
          color="primary"
          loading={loading}
        />
      </div>

      <ScheduleDashboardWidgets />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          ) : recentGrades.length > 0 ? (
            <ul className="space-y-2">
              {recentGrades.slice(0, 5).map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-surface-200/60 dark:border-surface-700/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {g.course?.name}
                    </p>
                    <p className="text-xs text-surface-500 capitalize truncate">
                      {g.type} · {g.title}
                    </p>
                  </div>
                  <GradeTag score={g.score} maxScore={g.max_score} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400 text-center py-6">
              {t('dashboard.noGradesYet')}
            </p>
          )}
        </Card>

        <Card
          title={t('dashboard.assignmentsDue')}
          actions={
            <Link to="/assignments" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
              {t('dashboard.viewAll')}
              <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
            </Link>
          }
        >
          {loading ? (
            <ListSkeleton rows={4} />
          ) : assignments.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {assignments.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-surface-200/60 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-800/30"
                >
                  <p className="font-medium text-sm text-surface-900 dark:text-white line-clamp-2">
                    {a.title}
                  </p>
                  <p className="text-xs text-surface-500 mt-1 truncate">{a.course?.name ?? '—'}</p>
                  <Badge color="warning" size="xs" className="mt-2">
                    {t('dashboard.assignmentDueOn', { date: formatDate(a.due_date) })}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400 text-center py-6">
              {t('dashboard.noAssignmentsDue')}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
