import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faChartBar,
  faDownload,
  faFilter,
  faFileLines,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { gradesAPI, coursesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { useUIStore } from '../../store';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import {
  StudentPageShell,
  GlassCard,
  StudentStatCard,
  StudentEmptyState,
} from '../../components/student/StudentUI';
import { Badge, GradeTag } from '../../components/common/UI';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const TYPE_BADGE = {
  exam: 'danger',
  quiz: 'warning',
  homework: 'info',
  project: 'purple',
};

function computeGpa(grades) {
  const scored = grades.filter((g) => g.score != null && g.max_score > 0);
  if (!scored.length) return null;
  const avg =
    scored.reduce((s, g) => {
      const pct = g.percentage ?? (Number(g.score) / Number(g.max_score)) * 100;
      return s + pct;
    }, 0) / scored.length;
  return avg.toFixed(1);
}

function computeAverage(grades) {
  const scored = grades.filter((g) => g.score != null && g.max_score > 0);
  if (!scored.length) return '0.0';
  const avg =
    scored.reduce((s, g) => {
      const pct = g.percentage ?? (Number(g.score) / Number(g.max_score)) * 100;
      return s + pct;
    }, 0) / scored.length;
  return avg.toFixed(1);
}

function avgByCourse(grades) {
  const map = {};
  grades.forEach((g) => {
    const cid = g.course_id ?? g.course?.id;
    const name = g.course?.code ?? g.course?.name ?? `Course ${cid}`;
    if (!cid || g.score == null || !g.max_score) return;
    const pct = g.percentage ?? (Number(g.score) / Number(g.max_score)) * 100;
    if (!map[cid]) map[cid] = { name, sum: 0, count: 0 };
    map[cid].sum += pct;
    map[cid].count += 1;
  });
  return Object.values(map).map(({ name, sum, count }) => ({
    name,
    avg: Math.round(sum / count),
  }));
}

export default function StudentGrades() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { studentId, name } = useStudentProfile();
  const { theme } = useUIStore();
  const [grades, setGrades] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState('');
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState('bar');

  const TYPE_OPTIONS = useMemo(
    () => [
      { value: '', label: t('common.allTypes') },
      { value: 'exam', label: t('gradesPage.typeExam') },
      { value: 'quiz', label: t('gradesPage.typeQuiz') },
      { value: 'homework', label: t('gradesPage.typeHomework') },
      { value: 'project', label: t('gradesPage.typeProject') },
    ],
    [t]
  );

  useEffect(() => {
    coursesAPI.list({ per_page: 100 }).then((res) => setCourses(res.data.data ?? [])).catch(() => {});
    gradesAPI
      .list({ per_page: 500 })
      .then((res) => setAllGrades(res.data.data ?? []))
      .catch(() => {});
  }, []);

  const semesters = useMemo(() => {
    const fromGrades = allGrades
      .map((g) => g.semester ?? g.course?.semester)
      .filter(Boolean);
    const fromCourses = courses.map((c) => c.semester).filter(Boolean);
    return [...new Set([...fromGrades, ...fromCourses])].sort();
  }, [allGrades, courses]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 200,
        ...(courseId && { course_id: courseId }),
        ...(type && { type }),
        ...(semester && { semester }),
      };
      const { data } = await gradesAPI.list(params);
      let rows = data.data ?? [];
      if (semester) {
        rows = rows.filter(
          (g) => (g.semester ?? g.course?.semester) === semester
        );
      }
      setGrades(rows);
    } catch {
      toast.error(t('gradesPage.loadError'));
    } finally {
      setLoading(false);
    }
  }, [courseId, type, semester, t]);

  useEffect(() => {
    load();
  }, [load]);

  const gpa = useMemo(() => computeGpa(grades), [grades]);
  const average = useMemo(() => computeAverage(grades), [grades]);
  const courseAvgs = useMemo(() => avgByCourse(grades), [grades]);

  const barChart = useMemo(() => {
    const dark = theme === 'dark';
    return {
      labels: courseAvgs.map((c) => c.name),
      datasets: [
        {
          label: t('studentPages.chartAverageLabel'),
          data: courseAvgs.map((c) => c.avg),
          backgroundColor: 'rgba(99,102,241,0.75)',
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, grid: { color: dark ? '#334155' : '#f1f5f9' } },
          x: { grid: { display: false } },
        },
      },
    };
  }, [courseAvgs, theme, t]);

  const doughnutChart = useMemo(() => {
    const buckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
    grades.forEach((g) => {
      if (g.score == null || !g.max_score) return;
      const pct = g.percentage ?? (Number(g.score) / Number(g.max_score)) * 100;
      if (pct >= 90) buckets.excellent += 1;
      else if (pct >= 75) buckets.good += 1;
      else if (pct >= 60) buckets.fair += 1;
      else buckets.poor += 1;
    });
    return {
      labels: [
        t('studentPages.chartBucket90'),
        t('studentPages.chartBucket75'),
        t('studentPages.chartBucket60'),
        t('studentPages.chartBucketLow'),
      ],
      datasets: [
        {
          data: [buckets.excellent, buckets.good, buckets.fair, buckets.poor],
          backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };
  }, [grades, t]);

  return (
    <StudentPageShell
      title={t('studentPages.gradesTitle')}
      subtitle={name ? t('studentPages.gradesSubtitleNamed', { name }) : t('studentPages.gradesSubtitleOwn')}
      actions={
        <Link
          to="/bulletins"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-glow"
        >
          <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
          {t('studentPages.academicBulletin')}
        </Link>
      }
    >
      <GlassCard className="!p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
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
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
              {t('common.type')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
              {t('studentPages.semester')}
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            >
              <option value="">{t('studentPages.allSemesters')}</option>
              {semesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-surface-500 pb-2.5">
              {user?.student?.grade_level ? `Grade ${user.student.grade_level}` : ''}
              {user?.student?.student_id ? ` · ${user.student.student_id}` : ''}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StudentStatCard
          title={t('studentPages.gpaAverage')}
          value={gpa != null ? `${gpa}%` : '—'}
          icon={faStar}
          color="warning"
          loading={loading}
        />
        <StudentStatCard
          title={t('studentPages.overallAverage')}
          value={`${average}%`}
          icon={faChartBar}
          color="primary"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-900 dark:text-white">{t('studentPages.performanceByCourse')}</h2>
            <div className="flex rounded-lg border border-surface-200 dark:border-surface-700 p-0.5">
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  chartMode === 'bar'
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                {t('studentPages.chartBar')}
              </button>
              <button
                type="button"
                onClick={() => setChartMode('doughnut')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  chartMode === 'doughnut'
                    ? 'bg-primary-500 text-white'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                {t('studentPages.chartDistribution')}
              </button>
            </div>
          </div>
          <div className="h-56">
            {loading ? (
              <div className="h-full rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
            ) : grades.length > 0 ? (
              chartMode === 'bar' && courseAvgs.length > 0 ? (
                <Bar data={barChart} options={barChart.options} />
              ) : chartMode === 'doughnut' ? (
                <Doughnut
                  data={doughnutChart}
                  options={{ cutout: '60%', plugins: { legend: { position: 'bottom' } } }}
                />
              ) : (
                <p className="text-sm text-surface-500 py-16 text-center">{t('studentPages.notEnoughChartData')}</p>
              )
            ) : (
              <p className="text-sm text-surface-500 py-16 text-center">{t('studentPages.noGradesRecorded')}</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faFileLines} className="text-primary-500 w-4 h-4" />
            {t('studentPages.summary')}
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between py-2 border-b border-surface-200/60 dark:border-surface-700/50">
                <span className="text-surface-500">{t('studentPages.totalGrades')}</span>
                <span className="font-semibold text-surface-900 dark:text-white">{grades.length}</span>
              </li>
              <li className="flex justify-between py-2 border-b border-surface-200/60 dark:border-surface-700/50">
                <span className="text-surface-500">{t('studentPages.coursesCount')}</span>
                <span className="font-semibold text-surface-900 dark:text-white">{courseAvgs.length}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-surface-500">{t('studentPages.examsCount')}</span>
                <span className="font-semibold text-surface-900 dark:text-white">
                  {grades.filter((g) => g.type === 'exam').length}
                </span>
              </li>
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard className="!p-0 overflow-hidden">
        <div className="p-5 lg:p-6 border-b border-surface-200/60 dark:border-surface-700/50">
          <h2 className="font-semibold text-surface-900 dark:text-white">{t('studentPages.gradeRecords')}</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
            ))}
          </div>
        ) : grades.length === 0 ? (
          <div className="p-6">
            <StudentEmptyState
              icon={faStar}
              title={t('studentPages.noGradesFound')}
              description={t('studentPages.noGradesHint')}
            />
          </div>
        ) : (
          <div className="responsive-table-wrap scroll-hint-x">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200/60 dark:border-surface-700/50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('gradesPage.columnCourse')}</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('gradesPage.columnType')}</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('gradesPage.columnTitle')}</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('gradesPage.columnScore')}</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400">{t('gradesPage.columnGrade')}</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400 hidden md:table-cell">{t('gradesPage.columnDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {grades.map((g) => {
                  const pct =
                    g.percentage ??
                    (g.max_score > 0 ? Math.round((Number(g.score) / Number(g.max_score)) * 100) : 0);
                  return (
                    <tr key={g.id} className="hover:bg-primary-500/[0.03] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-surface-900 dark:text-white">{g.course?.name ?? '—'}</p>
                        <p className="text-xs text-primary-500 font-mono">{g.course?.code}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge color={TYPE_BADGE[g.type] || 'gray'} size="xs">
                          {g.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-surface-700 dark:text-surface-300">{g.title}</td>
                      <td className="px-5 py-3.5 font-mono text-surface-600 dark:text-surface-400">
                        {g.score}/{g.max_score}
                      </td>
                      <td className="px-5 py-3.5">
                        <GradeTag grade={g.letter_grade || '—'} percentage={pct} />
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-surface-500">
                        {g.graded_at
                          ? new Date(g.graded_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </StudentPageShell>
  );
}
