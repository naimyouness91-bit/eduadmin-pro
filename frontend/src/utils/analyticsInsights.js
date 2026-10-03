import { aggregateTeacherPerformance, buildAttendanceByMonthMap, getFilteredMonthIndices } from './analyticsTransform';

export function computePeriodTrend(values) {
  if (!values?.length || values.length < 2) return undefined;
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const a = avg(first);
  const b = avg(second);
  if (a === 0 && b === 0) return undefined;
  if (a === 0) return 100;
  return Number((((b - a) / a) * 100).toFixed(1));
}

export function buildInsights(data) {
  const courses = data?.course_performance ?? [];
  const teachers = aggregateTeacherPerformance(courses);
  const attMap = buildAttendanceByMonthMap(data?.attendance_by_month);

  const bestClass = courses.reduce(
    (best, row) => (!best || (row.average_grade ?? 0) > (best.average_grade ?? 0) ? row : best),
    null
  );

  const mostUsedCourse = courses.reduce(
    (best, row) => (!best || (row.enrolled_count ?? 0) > (best.enrolled_count ?? 0) ? row : best),
    null
  );

  let highestAttendanceMonth = null;
  let bestRate = -1;
  Object.values(attMap).forEach((row) => {
    const total = (row.present ?? 0) + (row.absent ?? 0) + (row.late ?? 0) + (row.excused ?? 0);
    if (total <= 0) return;
    const rate = (row.present / total) * 100;
    if (rate > bestRate) {
      bestRate = rate;
      highestAttendanceMonth = row;
    }
  });

  return {
    bestClass: bestClass
      ? { name: bestClass.course?.name, value: `${bestClass.average_grade}%`, meta: bestClass.course?.code }
      : null,
    highestAttendance: highestAttendanceMonth
      ? { name: `Month ${highestAttendanceMonth.month}`, value: `${bestRate.toFixed(1)}%`, meta: 'Peak attendance rate' }
      : null,
    topTeacher: teachers[0]
      ? { name: teachers[0].name, value: `${teachers[0].average_grade?.toFixed(1)}%`, meta: `${teachers[0].courses} courses` }
      : null,
    topStudent: data?.top_students?.[0]
      ? {
          name: data.top_students[0].student?.user?.name ?? 'Student',
          value: `${Number(data.top_students[0].average_grade).toFixed(1)}%`,
          meta: 'Average grade',
        }
      : null,
    mostUsedCourse: mostUsedCourse
      ? { name: mostUsedCourse.course?.name, value: String(mostUsedCourse.enrolled_count ?? 0), meta: 'Enrolled students' }
      : null,
  };
}

export function applyPeriodPreset(preset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (preset) {
    case 'today':
    case 'week':
    case 'month':
      return { year, monthFrom: month, monthTo: month, preset };
    case 'year':
      return { year, monthFrom: 1, monthTo: 12, preset };
    default:
      return { year, monthFrom: 1, monthTo: 12, preset: 'custom' };
  }
}

export function buildWeeklyAttendanceSeries(attendanceTrend = []) {
  const rows = attendanceTrend.slice(-7);
  return {
    labels: rows.map((r) => {
      const d = new Date(r.date);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    present: rows.map((r) => r.present ?? 0),
    absent: rows.map((r) => r.absent ?? 0),
    late: rows.map((r) => r.late ?? 0),
  };
}

export function buildAiUsageSeries(platform) {
  return {
    labels: ['Submissions', 'Meetings', 'Activity Logs', 'Assignments'],
    values: [
      platform?.submissionsTotal ?? 0,
      platform?.meetingsTotal ?? 0,
      platform?.activityTotal ?? 0,
      platform?.assignmentsTotal ?? 0,
    ],
  };
}

export function buildSystemActivitySeries(platform) {
  return {
    labels: ['Logins / Activity', 'Meetings', 'Notifications', 'Messages'],
    values: [
      platform?.activityTotal ?? 0,
      platform?.meetingsTotal ?? 0,
      platform?.notificationsTotal ?? 0,
      platform?.messagesTotal ?? 0,
    ],
  };
}

export function buildTeacherActivitySeries(data) {
  const teachers = aggregateTeacherPerformance(data?.course_performance ?? []).slice(0, 8);
  return {
    labels: teachers.map((t) => t.name?.split(' ')[0] ?? 'Teacher'),
    classes: teachers.map((t) => t.courses ?? 0),
    grades: teachers.map((t) => Math.round(t.average_grade ?? 0)),
  };
}

export function enrollmentTrendPercent(data, monthFrom, monthTo) {
  const months = getFilteredMonthIndices(monthFrom, monthTo);
  const values = months.map((m) => (data?.monthly_enrollments ?? []).find((r) => r.month === m)?.count ?? 0);
  return computePeriodTrend(values);
}
