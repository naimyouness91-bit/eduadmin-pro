import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faClipboardCheck,
  faChartLine,
  faBook,
  faChalkboardTeacher,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../common/UI';

export default function AnalyticsKpiRow({ kpis, loading }) {
  const { t } = useTranslation();

  const items = [
    {
      title: t('analytics.kpiEnrollments'),
      value: loading ? '—' : String(kpis.enrollments),
      icon: faUsers,
      color: 'primary',
      subtitle: t('analytics.kpiEnrollmentsSub'),
    },
    {
      title: t('analytics.kpiAvgGrade'),
      value: loading || kpis.avgGrade == null ? '—' : `${kpis.avgGrade}%`,
      icon: faChartLine,
      color: 'success',
      subtitle: t('analytics.kpiAvgGradeSub'),
    },
    {
      title: t('analytics.kpiAttendance'),
      value: loading || kpis.attendanceRate == null ? '—' : `${kpis.attendanceRate}%`,
      icon: faClipboardCheck,
      color: 'info',
      subtitle: t('analytics.kpiAttendanceSub'),
    },
    {
      title: t('analytics.kpiCourses'),
      value: loading ? '—' : String(kpis.courses),
      icon: faBook,
      color: 'warning',
      subtitle: t('analytics.kpiCoursesSub'),
    },
    {
      title: t('analytics.kpiTeachers'),
      value: loading ? '—' : String(kpis.teachers),
      icon: faChalkboardTeacher,
      color: 'purple',
      subtitle: t('analytics.kpiTeachersSub'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {items.map((item) => (
        <StatCard
          key={item.title}
          title={item.title}
          value={item.value}
          icon={item.icon}
          color={item.color}
          subtitle={item.subtitle}
          loading={loading}
        />
      ))}
    </div>
  );
}
