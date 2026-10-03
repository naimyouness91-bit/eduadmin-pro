import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  faUsers,
  faChalkboardTeacher,
  faBook,
  faClipboardCheck,
  faBell,
  faTrophy,
  faCalendarCheck,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { dashboardAPI } from '../../services/api';
import { useAuthStore, useUIStore } from '../../store';
import { withTimeout, API_TIMEOUT_MS } from '../../utils/withTimeout';
import { StatCard, Card, Badge, Avatar } from '../../components/common/UI';
import { buildChartOptions, gridColor, textColor } from '../../utils/chartTheme';
import { getPrimaryColorHex } from '../../config/colorThemes';
import AdminDashboardWidgets from '../../components/dashboard/AdminDashboardWidgets';
import ScheduleDashboardWidgets from '../../components/schedule/ScheduleDashboardWidgets';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from '../student/StudentDashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

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

function formatChartDate(dateStr, locale = 'en-US') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function formatTimestamp(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapGradeDistribution(raw) {
  const buckets = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([grade, count]) => {
      const letter = String(grade).charAt(0).toUpperCase();
      if (letter in buckets) buckets[letter] += Number(count) || 0;
      else if (grade === 'F') buckets.F += Number(count) || 0;
    });
  }
  return {
    labels: ['A', 'B', 'C', 'D', 'F'],
    data: ['A', 'B', 'C', 'D', 'F'].map((k) => buckets[k]),
  };
}

function computeAttendanceRate(trend) {
  if (!trend?.length) return null;
  const totals = trend.reduce(
    (acc, row) => ({
      present: acc.present + (row.present ?? 0),
      absent: acc.absent + (row.absent ?? 0),
    }),
    { present: 0, absent: 0 }
  );
  const total = totals.present + totals.absent;
  if (total === 0) return null;
  return ((totals.present / total) * 100).toFixed(1);
}

function actionBadgeColor(action = '') {
  if (action.includes('delete') || action.includes('logout')) return 'danger';
  if (action.includes('create') || action.includes('login')) return 'success';
  if (action.includes('update')) return 'info';
  return 'gray';
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-surface-200 dark:bg-surface-700 rounded-lg" />
        <div className="h-4 w-48 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
      <div className="h-11 w-36 bg-surface-200 dark:bg-surface-700 rounded-xl" />
    </div>
  );
}

function ChartSkeleton({ tall }) {
  return (
    <div className={`chart-responsive ${tall ? 'lg:h-72' : ''} bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse`} />
  );
}

function AdminDashboard({ data, loading, user, canManageStudents }) {
  const { t, i18n } = useTranslation();
  const { theme, colorTheme } = useUIStore();
  const greetingText = useDashboardGreeting();
  const appLocale = useAppLocale();

  const attendanceRate = useMemo(
    () => computeAttendanceRate(data?.attendance_trend),
    [data?.attendance_trend]
  );

  const lineChartData = useMemo(() => {
    const trend = data?.attendance_trend ?? [];
    return {
      labels: trend.map((d) => formatChartDate(d.date, appLocale)),
      datasets: [
        {
          label: t('common.present'),
          data: trend.map((d) => d.present ?? 0),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#22c55e',
        },
        {
          label: t('common.absent'),
          data: trend.map((d) => d.absent ?? 0),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#ef4444',
        },
      ],
    };
  }, [data?.attendance_trend, t, appLocale]);

  const gradeDist = useMemo(
    () => mapGradeDistribution(data?.grade_distribution),
    [data?.grade_distribution]
  );

  const doughnutData = useMemo(
    () => ({
      labels: gradeDist.labels,
      datasets: [
        {
          data: gradeDist.data,
          backgroundColor: ['#22c55e', getPrimaryColorHex(), '#f59e0b', '#f97316', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    }),
    [gradeDist, colorTheme]
  );

  const lineOptions = useMemo(
    () =>
      buildChartOptions({
        scales: {
          x: {
            grid: { color: gridColor() },
            ticks: { color: textColor(), font: { size: 11 }, maxTicksLimit: 10 },
          },
          y: {
            grid: { color: gridColor() },
            ticks: { color: textColor(), font: { size: 11 } },
            beginAtZero: true,
          },
        },
      }),
    [theme, i18n.language]
  );

  const doughnutOptions = useMemo(
    () =>
      buildChartOptions({
        cutout: '70%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: textColor(),
              font: { size: 11 },
              padding: 12,
              boxWidth: 10,
            },
          },
        },
      }),
    [theme, i18n.language]
  );

  return (
    <AdminDashboardWidgets
      data={data}
      loading={loading}
      user={user}
      canManageStudents={canManageStudents}
      greetingText={greetingText}
      appLocale={appLocale}
      attendanceRate={attendanceRate}
      lineChartData={lineChartData}
      lineOptions={lineOptions}
      doughnutData={doughnutData}
      doughnutOptions={doughnutOptions}
      formatChartDate={formatChartDate}
      formatTimestamp={formatTimestamp}
      actionBadgeColor={actionBadgeColor}
    />
  );
}

function RoleDashboard({ data, loading, user }) {
  const { t } = useTranslation();
  const role = data?.role || user?.role;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const greetingText = useDashboardGreeting();
  const roleLabel = role ? t(`roles.${role}`, { defaultValue: role }) : role;
  const appLocale = useAppLocale();

  return (
    <div className="space-y-6 animate-fade-in">
      {loading ? (
        <HeaderSkeleton />
      ) : (
        <div>
          <h1 className="font-display font-bold text-2xl text-surface-900 dark:text-white">
            {greetingText}, <span className="text-primary-500">{firstName}</span> 👋
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
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <StatCard key={i} title="" value="" loading />
          ))
        ) : role === 'teacher' ? (
          <>
            <StatCard
              title={t('dashboard.myCourses')}
              value={data?.my_courses?.length ?? 0}
              icon={faBook}
              color="primary"
            />
            <StatCard
              title={t('dashboard.todaysAttendance')}
              value={data?.today_attendance?.length ?? 0}
              icon={faClipboardCheck}
              color="info"
            />
            <StatCard
              title={t('dashboard.pendingSubmissions')}
              value={data?.pending_submissions?.length ?? 0}
              icon={faTrophy}
              color="warning"
            />
          </>
        ) : role === 'student' ? (
          <>
            <StatCard
              title={t('dashboard.enrolledCourses')}
              value={data?.enrolled_courses?.length ?? 0}
              icon={faBook}
              color="primary"
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
            />
            <StatCard
              title={t('dashboard.upcomingAssignments')}
              value={data?.upcoming_assignments?.length ?? 0}
              icon={faCalendarCheck}
              color="warning"
            />
          </>
        ) : role === 'parent' ? (
          <>
            <StatCard title={t('dashboard.children')} value={data?.children?.length ?? 0} icon={faUsers} color="primary" />
            <StatCard
              title={t('dashboard.avgGrade')}
              value={
                data?.children?.length
                  ? `${Math.round(
                      data.children.reduce((s, c) => s + (Number(c.average_grade) || 0), 0) /
                        data.children.length
                    )}%`
                  : '—'
              }
              icon={faTrophy}
              color="success"
            />
            <StatCard
              title={t('dashboard.notifications')}
              value={data?.notifications?.filter((n) => !n.read_at)?.length ?? 0}
              icon={faBell}
              color="warning"
            />
          </>
        ) : null}
      </div>

      {(role === 'teacher' || role === 'parent') && <ScheduleDashboardWidgets />}

      <Card title={t('dashboard.overview')} subtitle={t('dashboard.workspace', { role: roleLabel })}>
        {loading ? (
          <ChartSkeleton tall />
        ) : role === 'parent' && data?.children?.length ? (
          <div className="space-y-4">
            {data.children.map((child) => (
              <div key={child.student.id} className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={child.student.user?.avatar_url} name={child.student.user?.name} />
                    <div>
                      <p className="font-semibold text-surface-900 dark:text-white">{child.student.user?.name}</p>
                      <p className="text-xs text-surface-400">{child.student.student_id} · {child.student.grade_level}</p>
                    </div>
                  </div>
                  <div className="flex flex-col xs:flex-row gap-2 xs:gap-4 text-sm">
                    <span>{t('dashboard.avgGrade')}: <strong>{child.average_grade ?? '—'}%</strong></span>
                    <span>{t('dashboard.attendanceRate')}: <strong>{child.attendance_rate ?? '—'}%</strong></span>
                  </div>
                </div>
                {child.recent_grades?.length > 0 && (
                  <div className="text-xs text-surface-500">
                    {t('dashboard.recentGrades')}: {child.recent_grades[0].course?.name} — {child.recent_grades[0].score}/{child.recent_grades[0].max_score}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Link to="/grades" className="text-xs text-primary-500 hover:underline">{t('dashboard.allGrades')}</Link>
                  <Link to="/attendance" className="text-xs text-primary-500 hover:underline">{t('nav.attendance')}</Link>
                  <Link to="/schedule" className="text-xs text-primary-500 hover:underline">{t('nav.schedule')}</Link>
                </div>
              </div>
            ))}
            {data.upcoming_events?.length > 0 && (
              <div className="pt-2 border-t border-surface-100 dark:border-surface-800">
                <p className="text-xs font-semibold text-surface-400 uppercase mb-2">{t('dashboard.upcomingEvents')}</p>
                {data.upcoming_events.slice(0, 3).map((ev) => (
                  <p key={ev.id} className="text-sm text-surface-600 dark:text-surface-400">{ev.title} — {formatChartDate(ev.start_date, appLocale)}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            {t('dashboard.sidebarHint')}
          </p>
        )}
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentDashboard />;
  if (hasRole('teacher')) return <TeacherDashboard />;
  return <StaffDashboard />;
}

function StaffDashboard() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = hasRole('super_admin', 'admin');

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

  if (isAdmin || data?.role === 'admin') {
    return (
      <AdminDashboard
        data={data}
        loading={loading}
        user={user}
        canManageStudents={isAdmin}
      />
    );
  }

  return <RoleDashboard data={data} loading={loading} user={user} />;
}
