import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faSearch,
  faFilter,
  faArrowRight,
  faCalendarCheck,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { coursesAPI, gradesAPI, dashboardAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import {
  StudentPageShell,
  GlassCard,
  StudentEmptyState,
  StudentSkeletonGrid,
} from '../../components/student/StudentUI';
import { Avatar, Badge } from '../../components/common/UI';

const COVER_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
];

function statusColor(status) {
  const map = { active: 'success', inactive: 'gray', archived: 'warning' };
  return map[status] || 'gray';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function courseProgress(course, gradeMap) {
  const fromGrades = gradeMap[course.id];
  if (fromGrades != null) return Math.min(100, Math.round(fromGrades));
  const cap = course.max_students || 30;
  const enrolled = course.students_count ?? 0;
  return Math.min(100, Math.round((enrolled / cap) * 100));
}

export default function StudentCourses() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: '', label: t('common.allStatuses') },
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
      { value: 'archived', label: t('common.archived') },
    ],
    [t]
  );
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [gradeMap, setGradeMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        per_page: 50,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status && { status }),
      };
      const [coursesRes, gradesRes, dashRes] = await Promise.all([
        coursesAPI.list(params),
        gradesAPI.list({ per_page: 200 }).catch(() => ({ data: { data: [] } })),
        dashboardAPI.get().catch(() => ({ data: {} })),
      ]);
      setCourses(coursesRes.data.data ?? []);
      setAssignments(dashRes.data?.upcoming_assignments ?? []);

      const map = {};
      (gradesRes.data.data ?? []).forEach((g) => {
        const cid = g.course_id ?? g.course?.id;
        if (!cid || g.score == null || !g.max_score) return;
        const pct = (Number(g.score) / Number(g.max_score)) * 100;
        if (!map[cid]) map[cid] = { sum: 0, count: 0 };
        map[cid].sum += pct;
        map[cid].count += 1;
      });
      const avgMap = {};
      Object.entries(map).forEach(([id, { sum, count }]) => {
        avgMap[id] = sum / count;
      });
      setGradeMap(avgMap);
    } catch {
      toast.error(t('studentPages.loadCoursesFailed'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, t]);

  useEffect(() => {
    load();
  }, [load]);

  const subtitle = useMemo(() => {
    const grade = user?.student?.grade_level;
    return grade
      ? t('studentPages.coursesSubtitleGrade', { grade })
      : t('studentPages.coursesSubtitleOwn');
  }, [user?.student?.grade_level, t]);

  return (
    <StudentPageShell
      title={t('studentPages.coursesTitle')}
      subtitle={subtitle}
      actions={
        <span className="text-xs text-surface-500 dark:text-surface-400 tabular-nums">
          {loading ? '…' : t('studentPages.coursesCount', { count: courses.length })}
        </span>
      }
    >
      <GlassCard className="!p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 w-4 h-4"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('studentPages.searchCourses')}
              className="w-full bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors"
            />
          </div>
          <div className="relative sm:w-48">
            <FontAwesomeIcon
              icon={faFilter}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 w-3.5 h-3.5 pointer-events-none"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full appearance-none bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <StudentSkeletonGrid count={6} />
      ) : courses.length === 0 ? (
        <StudentEmptyState
          icon={faBook}
          title={t('studentPages.noCoursesFound')}
          description={
            debouncedSearch || status
              ? t('studentPages.noCoursesFiltered')
              : t('studentPages.noCoursesEnrolled')
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course, index) => {
            const progress = courseProgress(course, gradeMap);
            const hasGradeProgress = gradeMap[course.id] != null;
            return (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group block rounded-2xl border border-white/10 dark:border-white/[0.06] bg-white/70 dark:bg-surface-900/60 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-300"
              >
                <div className={`relative h-28 bg-gradient-to-br ${COVER_GRADIENTS[index % 6]} p-4`}>
                  <span className="absolute top-3 left-3 font-mono text-xs font-bold text-white/90 bg-black/20 backdrop-blur px-2 py-1 rounded-lg">
                    {course.code}
                  </span>
                  <Badge color={statusColor(course.status)} size="xs" className="absolute top-3 right-3">
                    {course.status}
                  </Badge>
                  <FontAwesomeIcon icon={faBook} className="absolute bottom-2 right-3 w-14 h-14 text-white/15" />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-surface-900 dark:text-white line-clamp-1 group-hover:text-primary-500 transition-colors">
                    {course.name}
                  </h3>
                  <p className="text-xs text-surface-500 mt-1.5 line-clamp-2 min-h-[2.5rem]">
                    {course.description || t('studentPages.noDescription')}
                  </p>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-surface-500 mb-1.5">
                      <span>{hasGradeProgress ? t('studentPages.courseAverage') : t('studentPages.enrollment')}</span>
                      <span className="font-semibold text-surface-700 dark:text-surface-300">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-200/60 dark:border-surface-700/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={course.teacher?.user?.name} size="xs" />
                      <span className="text-xs text-surface-500 truncate">
                        {course.teacher?.user?.name || t('courses.unassigned')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-500 shrink-0">
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                        {course.students_count ?? 0}
                      </span>
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="w-3 h-3 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarCheck} className="text-warning-500 w-4 h-4" />
            {t('studentPages.upcomingDeadlines')}
          </h2>
          <Link to="/events" className="text-xs text-primary-500 hover:underline">
            {t('studentPages.viewCalendar')}
          </Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
            ))}
          </div>
        ) : assignments.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {assignments.slice(0, 6).map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-xl border border-warning-500/20 bg-warning-500/5 hover:bg-warning-500/10 transition-colors"
              >
                <p className="font-medium text-sm text-surface-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-surface-500 mt-1">{a.course?.name ?? t('common.course')}</p>
                <Badge color="warning" size="xs" className="mt-2">
                  {t('studentPages.dueDate', { date: formatDate(a.due_date) })}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-surface-500 text-center py-6">
            {t('studentPages.noUpcomingDeadlines')}
          </p>
        )}
      </GlassCard>
    </StudentPageShell>
  );
}
