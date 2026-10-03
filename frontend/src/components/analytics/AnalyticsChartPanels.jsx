import { memo, useMemo } from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faClipboardCheck,
  faGraduationCap,
  faChalkboardTeacher,
  faRobot,
  faServer,
} from '@fortawesome/free-solid-svg-icons';
import { getPrimaryColorHex } from '../../config/colorThemes';
import {
  CHART_PALETTE,
  GRADE_DIST_COLORS,
  GRADE_DIST_LABELS,
} from '../../config/analyticsCharts';
import {
  aggregateTeacherPerformance,
  buildGradeDistribution,
  buildMonthlyActivitySeries,
  filterMonthLabels,
  monthSeries,
  buildAttendanceByMonthMap,
} from '../../utils/analyticsTransform';
import {
  buildWeeklyAttendanceSeries,
  buildAiUsageSeries,
  buildSystemActivitySeries,
  buildTeacherActivitySeries,
} from '../../utils/analyticsInsights';
import { buildChartOptions, textColor } from '../../utils/chartTheme';
import ChartCard from './ChartCard';
import AnalyticsSectionHeader from './AnalyticsSectionHeader';
import { useAnalyticsScales, INTERACTIVE_TOOLTIP } from './useAnalyticsChartOptions';

const MEDAL = ['🥇', '🥈', '🥉'];

function AnalyticsChartPanels({
  analytics,
  platform,
  monthFrom,
  monthTo,
  year,
  loading,
}) {
  const { t } = useTranslation();
  const scales = useAnalyticsScales();
  const scalesPercent = useAnalyticsScales({ min: 0, max: 100 });
  const scalesStacked = useAnalyticsScales({ stacked: true });
  const primaryHex = getPrimaryColorHex();

  const labels = useMemo(() => filterMonthLabels(monthFrom, monthTo), [monthFrom, monthTo]);

  const lineAreaOptions = useMemo(
    () =>
      buildChartOptions({
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, position: 'top', labels: { color: textColor() } }, tooltip: INTERACTIVE_TOOLTIP },
        scales: scalesPercent,
      }),
    [scalesPercent]
  );

  const barOptions = useMemo(
    () =>
      buildChartOptions({
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, position: 'top', labels: { color: textColor() } }, tooltip: INTERACTIVE_TOOLTIP },
        scales,
      }),
    [scales]
  );

  const stackedBarOptions = useMemo(
    () =>
      buildChartOptions({
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, position: 'top', labels: { color: textColor() } }, tooltip: INTERACTIVE_TOOLTIP },
        scales: { x: { ...scalesStacked.x, stacked: true }, y: { ...scalesStacked.y, stacked: true } },
      }),
    [scalesStacked]
  );

  const pieOptions = useMemo(
    () =>
      buildChartOptions({
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: textColor(), padding: 12, boxWidth: 10 } },
          tooltip: INTERACTIVE_TOOLTIP,
        },
      }),
    []
  );

  const studentGrowthData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'New enrollments',
          data: monthSeries(analytics?.monthly_enrollments, 'count', monthFrom, monthTo),
          borderColor: CHART_PALETTE.primary,
          backgroundColor: 'rgba(99,102,241,0.25)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
      ],
    }),
    [analytics, labels, monthFrom, monthTo]
  );

  const weeklyAttendance = useMemo(
    () => buildWeeklyAttendanceSeries(platform?.attendanceTrend),
    [platform]
  );

  const weeklyAttendanceData = useMemo(
    () => ({
      labels: weeklyAttendance.labels,
      datasets: [
        { label: 'Present', data: weeklyAttendance.present, backgroundColor: CHART_PALETTE.success, borderRadius: 6 },
        { label: 'Absent', data: weeklyAttendance.absent, backgroundColor: CHART_PALETTE.danger, borderRadius: 6 },
        { label: 'Late', data: weeklyAttendance.late, backgroundColor: CHART_PALETTE.warning, borderRadius: 6 },
      ],
    }),
    [weeklyAttendance]
  );

  const attendanceTrendData = useMemo(() => {
    const attMap = buildAttendanceByMonthMap(analytics?.attendance_by_month);
    const months = Array.from({ length: 12 }, (_, i) => i + 1).filter(
      (m) => m >= Math.min(monthFrom, monthTo) && m <= Math.max(monthFrom, monthTo)
    );
    const present = months.map((m) => attMap[m]?.present ?? 0);
    const absent = months.map((m) => attMap[m]?.absent ?? 0);
    const total = present.map((p, i) => p + absent[i] + (attMap[months[i]]?.late ?? 0));
    const rate = total.map((tot, i) => (tot > 0 ? Number(((present[i] / tot) * 100).toFixed(1)) : 0));
    return {
      labels,
      datasets: [
        {
          label: 'Attendance rate %',
          data: rate,
          borderColor: CHART_PALETTE.info,
          backgroundColor: 'rgba(59,130,246,0.15)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [analytics, labels, monthFrom, monthTo]);

  const gradeDistributionPie = useMemo(
    () => ({
      labels: GRADE_DIST_LABELS,
      datasets: [{ data: buildGradeDistribution(analytics), backgroundColor: GRADE_DIST_COLORS, borderWidth: 0, hoverOffset: 8 }],
    }),
    [analytics]
  );

  const courseStatsData = useMemo(() => {
    const items = (analytics?.course_performance ?? []).slice(0, 10);
    return {
      labels: items.map((r) => r.course?.code || r.course?.name?.slice(0, 12) || '—'),
      datasets: [
        {
          label: 'Avg grade %',
          data: items.map((r) => r.average_grade ?? 0),
          backgroundColor: `${primaryHex}cc`,
          borderRadius: 8,
        },
      ],
    };
  }, [analytics, primaryHex]);

  const teacherActivity = useMemo(() => buildTeacherActivitySeries(analytics), [analytics]);
  const teacherActivityData = useMemo(
    () => ({
      labels: teacherActivity.labels,
      datasets: [
        { label: 'Classes', data: teacherActivity.classes, backgroundColor: CHART_PALETTE.purple, borderRadius: 8 },
        { label: 'Avg grade %', data: teacherActivity.grades, backgroundColor: CHART_PALETTE.teal, borderRadius: 8 },
      ],
    }),
    [teacherActivity]
  );

  const aiUsage = useMemo(() => buildAiUsageSeries(platform), [platform]);
  const aiUsageData = useMemo(
    () => ({
      labels: ['AI Quizzes', 'Platform Activity', 'Meetings', 'Assignments'],
      datasets: [
        {
          label: 'Usage count',
          data: aiUsage.values,
          backgroundColor: [CHART_PALETTE.primary, CHART_PALETTE.info, CHART_PALETTE.teal, CHART_PALETTE.warning],
          borderRadius: 8,
        },
      ],
    }),
    [aiUsage]
  );

  const systemActivity = useMemo(() => buildSystemActivitySeries(platform), [platform]);
  const systemActivityData = useMemo(
    () => ({
      labels: systemActivity.labels,
      datasets: [
        {
          data: systemActivity.values,
          backgroundColor: [CHART_PALETTE.primary, CHART_PALETTE.success, CHART_PALETTE.warning, CHART_PALETTE.info],
          borderWidth: 0,
        },
      ],
    }),
    [systemActivity]
  );

  const monthlyActivity = useMemo(
    () => buildMonthlyActivitySeries(analytics, monthFrom, monthTo),
    [analytics, monthFrom, monthTo]
  );

  const monthlyActivityData = useMemo(
    () => ({
      labels: monthlyActivity.labels,
      datasets: [
        {
          label: 'Enrollments',
          data: monthlyActivity.enrollments,
          borderColor: CHART_PALETTE.primary,
          backgroundColor: 'rgba(99,102,241,0.3)',
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Attendance records',
          data: monthlyActivity.attendance,
          borderColor: CHART_PALETTE.teal,
          backgroundColor: 'rgba(20,184,166,0.2)',
          fill: true,
          tension: 0.35,
        },
      ],
    }),
    [monthlyActivity]
  );

  const topStudents = analytics?.top_students ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <AnalyticsSectionHeader icon={faChartLine} title={t('analytics.sectionGrowthEnrollment')} subtitle={t('analytics.sectionGrowthEnrollmentSub')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t('analytics.chartStudentGrowth')} subtitle={t('analytics.chartStudentGrowthSub', { year })} loading={loading} tall className="lg:col-span-2">
            <Line data={studentGrowthData} options={lineAreaOptions} />
          </ChartCard>
          <ChartCard title={t('analytics.monthlyActivity')} subtitle={t('analytics.chartMonthlyActivitySub')} loading={loading} tall>
            <Line data={monthlyActivityData} options={lineAreaOptions} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader icon={faClipboardCheck} title={t('analytics.sectionAttendanceAnalytics')} subtitle={t('analytics.sectionAttendanceAnalyticsSub')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t('analytics.chartAttendanceRateTrend')} subtitle={t('analytics.chartAttendanceRateTrendSub')} loading={loading} tall>
            <Line data={attendanceTrendData} options={lineAreaOptions} />
          </ChartCard>
          <ChartCard title={t('analytics.chartWeeklyAttendance')} subtitle={t('analytics.chartWeeklyAttendanceSub')} loading={loading} tall>
            <Bar data={weeklyAttendanceData} options={stackedBarOptions} />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader icon={faGraduationCap} title={t('analytics.sectionAcademicPerformance')} subtitle={t('analytics.sectionAcademicPerformanceSub')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={t('analytics.chartAvgGradesByClass')} subtitle={t('analytics.chartAvgGradesByClassSub')} loading={loading} tall>
            <Bar data={courseStatsData} options={{ ...barOptions, indexAxis: 'y' }} />
          </ChartCard>
          <ChartCard title={t('analytics.gradeDistribution')} subtitle={t('analytics.chartGradeDistributionSub')} loading={loading}>
            <Doughnut data={gradeDistributionPie} options={{ ...pieOptions, cutout: '62%' }} />
          </ChartCard>
          <ChartCard title={t('analytics.topStudents')} subtitle={t('analytics.chartTopStudentsSub')} loading={loading} className="lg:col-span-2">
            {topStudents.length ? (
              <ul className="space-y-3 py-2 max-h-72 overflow-y-auto">
                {topStudents.slice(0, 8).map((row, index) => {
                  const pct = Number(row.average_grade) || 0;
                  const name = row.student?.user?.name || t('analytics.studentFallback');
                  return (
                    <li key={row.student?.id ?? index} className="flex items-center gap-3">
                      <span className="w-8 text-center text-lg shrink-0">{index < 3 ? MEDAL[index] : <span className="text-sm font-bold text-surface-400">{index + 1}</span>}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-surface-900 dark:text-white truncate">{name}</span>
                          <span className="font-semibold text-primary-500 shrink-0 ms-2">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-surface-400 text-center py-8">{t('analytics.noData')}</p>
            )}
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader icon={faChalkboardTeacher} title={t('analytics.sectionTeacherActivity')} subtitle={t('analytics.sectionTeacherActivitySub')} />
        <ChartCard title={t('analytics.teacherPerformance')} subtitle={t('analytics.chartTeacherPerformanceSub')} loading={loading} tall className="max-w-4xl">
          <Bar data={teacherActivityData} options={barOptions} />
        </ChartCard>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader icon={faRobot} title={t('analytics.sectionAiUsage')} subtitle={t('analytics.sectionAiUsageSub')} />
        <ChartCard title={t('analytics.chartAiPlatformUsage')} subtitle={t('analytics.chartAiPlatformUsageSub')} loading={loading} tall className="max-w-3xl">
          <Bar data={aiUsageData} options={barOptions} />
        </ChartCard>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader icon={faServer} title={t('analytics.sectionSystemActivity')} subtitle={t('analytics.sectionSystemActivitySub')} />
        <ChartCard title={t('analytics.chartSystemOverview')} subtitle={t('analytics.chartSystemOverviewSub')} loading={loading} className="max-w-lg">
          <Pie data={systemActivityData} options={pieOptions} />
        </ChartCard>
      </section>
    </div>
  );
}

export default memo(AnalyticsChartPanels);
