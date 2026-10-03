import { GRADE_DIST_LABELS, MONTH_LABELS } from '../config/analyticsCharts';

/** Month indices (1–12) included in the filter range */
export function getFilteredMonthIndices(monthFrom, monthTo) {
  const from = Math.min(monthFrom, monthTo);
  const to = Math.max(monthFrom, monthTo);
  return MONTH_LABELS.map((_, i) => i + 1).filter((m) => m >= from && m <= to);
}

export function filterMonthLabels(monthFrom, monthTo) {
  const indices = getFilteredMonthIndices(monthFrom, monthTo);
  return indices.map((m) => MONTH_LABELS[m - 1]);
}

export function monthSeries(items, valueKey = 'count', monthFrom = 1, monthTo = 12) {
  const map = Object.fromEntries((items ?? []).map((r) => [r.month, r[valueKey]]));
  return getFilteredMonthIndices(monthFrom, monthTo).map((m) => map[m] ?? 0);
}

export function buildAttendanceByMonthMap(items) {
  return Object.fromEntries((items ?? []).map((r) => [r.month, r]));
}

export function computeAnalyticsKpis(data, monthFrom, monthTo) {
  const months = getFilteredMonthIndices(monthFrom, monthTo);

  const enrollments = (data?.monthly_enrollments ?? [])
    .filter((r) => months.includes(r.month))
    .reduce((s, r) => s + (r.count ?? 0), 0);

  const attendanceRows = (data?.attendance_by_month ?? []).filter((r) =>
    months.includes(r.month)
  );
  const present = attendanceRows.reduce((s, r) => s + (r.present ?? 0), 0);
  const absent = attendanceRows.reduce((s, r) => s + (r.absent ?? 0), 0);
  const late = attendanceRows.reduce((s, r) => s + (r.late ?? 0), 0);
  const excused = attendanceRows.reduce((s, r) => s + (r.excused ?? 0), 0);
  const attendanceTotal = present + absent + late + excused;
  const attendanceRate =
    attendanceTotal > 0 ? ((present / attendanceTotal) * 100).toFixed(1) : null;

  const gradeTrends = (data?.grade_trends ?? []).filter((r) => months.includes(r.month));
  const avgGrade =
    gradeTrends.length > 0
      ? (
          gradeTrends.reduce((s, r) => s + (Number(r.average) || 0), 0) / gradeTrends.length
        ).toFixed(1)
      : null;

  const courses = data?.course_performance?.length ?? 0;
  const teachers = aggregateTeacherPerformance(data?.course_performance ?? []).length;

  return { enrollments, attendanceRate, avgGrade, courses, teachers, attendanceTotal };
}

export function aggregateTeacherPerformance(coursePerformance) {
  const map = new Map();

  (coursePerformance ?? []).forEach((row) => {
    const teacher = row.course?.teacher;
    const teacherId = teacher?.id;
    if (!teacherId) return;

    const name = teacher?.user?.name || `Teacher #${teacherId}`;
    const existing = map.get(teacherId) ?? {
      id: teacherId,
      name,
      grades: [],
      enrolled: 0,
      courses: 0,
    };

    if (row.average_grade != null) existing.grades.push(Number(row.average_grade));
    existing.enrolled += row.enrolled_count ?? 0;
    existing.courses += 1;
    map.set(teacherId, existing);
  });

  return Array.from(map.values())
    .map((t) => ({
      id: t.id,
      name: t.name,
      average_grade:
        t.grades.length > 0
          ? t.grades.reduce((a, b) => a + b, 0) / t.grades.length
          : null,
      enrolled: t.enrolled,
      courses: t.courses,
    }))
    .filter((t) => t.average_grade != null)
    .sort((a, b) => b.average_grade - a.average_grade);
}

export function buildMonthlyActivitySeries(data, monthFrom, monthTo) {
  const months = getFilteredMonthIndices(monthFrom, monthTo);
  const enrollMap = Object.fromEntries(
    (data?.monthly_enrollments ?? []).map((r) => [r.month, r.count ?? 0])
  );
  const attMap = buildAttendanceByMonthMap(data?.attendance_by_month);

  return {
    labels: months.map((m) => MONTH_LABELS[m - 1]),
    enrollments: months.map((m) => enrollMap[m] ?? 0),
    attendance: months.map((m) => {
      const row = attMap[m];
      if (!row) return 0;
      return (row.present ?? 0) + (row.absent ?? 0) + (row.late ?? 0) + (row.excused ?? 0);
    }),
    grades: months.map((m) => {
      const trend = (data?.grade_trends ?? []).find((r) => r.month === m);
      return trend?.average ?? 0;
    }),
  };
}

export function buildGradeDistribution(data) {
  const dist = data?.grade_distribution ?? {};
  return GRADE_DIST_LABELS.map((l) => dist[l] ?? 0);
}
