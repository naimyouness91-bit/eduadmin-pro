import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck,
  faCheckCircle,
  faTimesCircle,
  faDownload,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { attendanceAPI, coursesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import {
  StudentPageShell,
  GlassCard,
  StudentStatCard,
  StudentEmptyState,
} from '../../components/student/StudentUI';
import { AttendanceBadge } from '../../components/common/UI';

ChartJS.register(ArcElement, Tooltip, Legend);

function defaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatWeekdayDate(val) {
  if (!val) return { day: '—', date: '' };
  const d = new Date(val);
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function countByStatus(records) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  records.forEach((r) => {
    if (counts[r.status] != null) counts[r.status] += 1;
  });
  return counts;
}

function computeRate(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const attended = counts.present + counts.late + counts.excused;
  return Math.round((attended / total) * 1000) / 10;
}

function exportCsv(records, headers) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...records.map((r) =>
      [r.date, r.course?.name ?? '', r.status, r.method ?? 'manual', r.notes ?? '']
        .map(escape)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-${todayIso()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StudentAttendance() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { studentId, name } = useStudentProfile();
  const [courses, setCourses] = useState([]);
  const [records, setRecords] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultFromDate);
  const [dateTo, setDateTo] = useState(todayIso);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coursesAPI.list({ per_page: 100 }).then((res) => setCourses(res.data.data ?? [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 500,
        ...(courseId && { course_id: courseId }),
        from: dateFrom,
        to: dateTo,
      };
      const { data } = await attendanceAPI.list(params);
      let rows = data.data ?? [];
      if (dateFrom || dateTo) {
        rows = rows.filter((r) => {
          const d = r.date?.slice(0, 10);
          if (!d) return true;
          if (dateFrom && d < dateFrom) return false;
          if (dateTo && d > dateTo) return false;
          return true;
        });
      }
      setRecords(rows);
    } catch {
      toast.error(t('studentPages.loadAttendanceFailed'));
    } finally {
      setLoading(false);
    }
  }, [courseId, dateFrom, dateTo, t]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => countByStatus(records), [records]);
  const rate = useMemo(() => computeRate(counts), [counts]);
  const total = useMemo(() => records.length, [records]);

  const chartData = useMemo(() => {
    return {
      labels: [
        t('common.present'),
        t('common.absent'),
        t('common.late'),
        t('common.excused'),
      ],
      datasets: [
        {
          data: [counts.present, counts.absent, counts.late, counts.excused],
          backgroundColor: ['#6366f1', '#ef4444', '#f59e0b', '#3b82f6'],
          borderWidth: 0,
        },
      ],
      empty: total === 0,
    };
  }, [counts, total, t]);

  const handleExport = () => {
    if (!records.length) {
      toast.error(t('studentPages.noRecordsToExport'));
      return;
    }
    exportCsv(records, [
      t('common.date'),
      t('common.course'),
      t('common.status'),
      t('studentPages.method'),
      t('timetable.notes'),
    ]);
    toast.success(t('studentPages.attendanceExported'));
  };

  const subtitle = name
    ? t('studentPages.attendanceSubtitleNamed', { name })
    : t('studentPages.attendanceSubtitle');

  return (
    <StudentPageShell
      title={t('studentPages.attendanceTitle')}
      subtitle={subtitle}
      actions={
        <button
          type="button"
          onClick={handleExport}
          disabled={!records.length}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
          {t('studentPages.exportCsv')}
        </button>
      }
    >
      <GlassCard className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
              {t('common.course')}
            </label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faFilter}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 w-3.5 h-3.5 pointer-events-none"
              />
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full appearance-none bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
              >
                <option value="">{t('common.allCourses')}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="lg:w-44">
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
              {t('attendancePage.from')}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
          <div className="lg:w-44">
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
              {t('attendancePage.to')}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StudentStatCard
          title={t('studentPages.attendanceRate')}
          value={`${rate}%`}
          icon={faClipboardCheck}
          color="success"
          loading={loading}
        />
        <StudentStatCard
          title={t('common.present')}
          value={counts.present}
          icon={faCheckCircle}
          color="primary"
          loading={loading}
        />
        <StudentStatCard
          title={t('common.absent')}
          value={counts.absent}
          icon={faTimesCircle}
          color="warning"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1">
          <h2 className="font-semibold text-surface-900 dark:text-white mb-4">{t('studentPages.statusBreakdown')}</h2>
          <div className="h-52 flex items-center justify-center">
            {loading ? (
              <div className="w-36 h-36 rounded-full bg-surface-100 dark:bg-surface-800 animate-pulse" />
            ) : total > 0 ? (
              <Doughnut
                data={chartData}
                options={{
                  cutout: '65%',
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12 } } },
                }}
              />
            ) : (
              <p className="text-sm text-surface-500">{t('studentPages.noDataInRange')}</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="p-5 lg:p-6 border-b border-surface-200/60 dark:border-surface-700/50">
            <h2 className="font-semibold text-surface-900 dark:text-white">{t('studentPages.attendanceHistory')}</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              {loading ? t('common.loading') : t('studentPages.recordCount', { count: total })}
              {studentId ? ` · ${t('common.id')} ${user?.student?.student_id ?? studentId}` : ''}
            </p>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-6">
              <StudentEmptyState
                icon={faClipboardCheck}
                title={t('studentPages.noAttendanceRecords')}
                description={t('studentPages.noAttendanceHint')}
              />
            </div>
          ) : (
            <div className="responsive-table-wrap scroll-hint-x">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200/60 dark:border-surface-700/50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('common.date')}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('common.course')}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('common.status')}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400 hidden sm:table-cell">{t('studentPages.method')}</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400 hidden md:table-cell">{t('timetable.notes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {records.map((row) => {
                    const { day, date } = formatWeekdayDate(row.date);
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-primary-500/[0.03] transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-surface-800 dark:text-surface-200">{day}</p>
                          <p className="text-xs text-surface-400">{date}</p>
                        </td>
                        <td className="px-5 py-3.5 text-surface-700 dark:text-surface-300">
                          {row.course?.name ?? '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <AttendanceBadge status={row.status} />
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell text-surface-500 capitalize">
                          {row.method || 'manual'}
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell text-surface-500 max-w-[180px] truncate">
                          {row.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </StudentPageShell>
  );
}
