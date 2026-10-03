import {
  faUsers,
  faChalkboardTeacher,
  faUsers as faParents,
  faBook,
  faClipboardCheck,
  faChartLine,
  faUserCheck,
  faFileCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../common/UI';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { computeAnalyticsKpis } from '../../utils/analyticsTransform';
import { enrollmentTrendPercent } from '../../utils/analyticsInsights';

function KpiCard({ title, rawValue, displayValue, icon, color, subtitle, trend, trendLabel, loading }) {
  const numeric = typeof rawValue === 'number' && !Number.isNaN(rawValue) ? rawValue : 0;
  const animated = useAnimatedCounter(loading ? 0 : numeric);
  const value = loading ? '—' : (displayValue ?? String(animated));

  return (
    <StatCard
      title={title}
      value={value}
      icon={icon}
      color={color}
      subtitle={subtitle}
      trend={trend}
      trendLabel={trendLabel}
      loading={loading}
    />
  );
}

export default function AnalyticsPremiumKpiRow({ analytics, platform, monthFrom, monthTo, loading }) {
  const { t } = useTranslation();
  const kpis = computeAnalyticsKpis(analytics, monthFrom, monthTo);
  const stats = platform?.stats ?? {};
  const enrollTrend = enrollmentTrendPercent(analytics, monthFrom, monthTo);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard title={t('analytics.kpiTotalStudents')} rawValue={stats.total_students ?? 0} icon={faUsers} color="primary" subtitle={t('analytics.kpiEnrolledPlatform')} trend={enrollTrend} trendLabel={t('analytics.vsPrior')} loading={loading} />
      <KpiCard title={t('analytics.kpiTotalTeachers')} rawValue={stats.total_teachers ?? 0} icon={faChalkboardTeacher} color="purple" subtitle={t('analytics.kpiActiveFaculty')} loading={loading} />
      <KpiCard title={t('analytics.kpiTotalParents')} rawValue={platform?.parentsTotal ?? 0} icon={faParents} color="info" subtitle={t('analytics.kpiRegisteredGuardians')} loading={loading} />
      <KpiCard title={t('analytics.kpiTotalCourses')} rawValue={stats.total_courses ?? kpis.courses} icon={faBook} color="warning" subtitle={t('analytics.kpiActivePrograms')} loading={loading} />
      <KpiCard title={t('analytics.kpiAttendanceRateTitle')} rawValue={0} displayValue={loading || kpis.attendanceRate == null ? '—' : `${kpis.attendanceRate}%`} icon={faClipboardCheck} color="success" subtitle={t('analytics.kpiSelectedPeriod')} loading={loading} />
      <KpiCard title={t('analytics.kpiAverageGrades')} rawValue={0} displayValue={loading || kpis.avgGrade == null ? '—' : `${kpis.avgGrade}%`} icon={faChartLine} color="success" subtitle={t('analytics.kpiAcademicPerformance')} loading={loading} />
      <KpiCard title={t('analytics.kpiActiveUsers')} rawValue={platform?.activeUsers ?? 0} icon={faUserCheck} color="primary" subtitle={t('analytics.kpiStudentsTeachersParents')} loading={loading} />
      <KpiCard title={t('analytics.kpiAssignmentsSubmitted')} rawValue={platform?.submissionsTotal ?? 0} icon={faFileCircleCheck} color="info" subtitle={t('analytics.kpiAssignmentsTotal', { count: platform?.assignmentsTotal ?? 0 })} loading={loading} />
    </div>
  );
}
