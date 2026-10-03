import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faClipboardList,
  faChartLine,
  faFileLines,
  faProjectDiagram,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';
import { gradesAPI, coursesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import StudentGrades from '../student/StudentGrades';
import ParentGradesView from '../../components/parent/ParentGradesView';
import {
  PageHeader,
  Card,
  Select,
  Table,
  Pagination,
  Badge,
  Button,
  ConfirmDialog,
  GradeTag,
} from '../../components/common/UI';
import MiniStatCard from '../../components/common/MiniStatCard';
import GradeFormModal from '../../components/grades/GradeFormModal';
import BulletinStatusBadge from '../../components/bulletins/BulletinStatusBadge';
import BulletinWorkflowModal from '../../components/bulletins/BulletinWorkflowModal';
import { useBulletinStatusMap } from '../../hooks/useBulletinStatusMap';

const TYPE_BADGE = {
  exam: 'danger',
  quiz: 'warning',
  homework: 'info',
  assignment: 'info',
  project: 'purple',
};

function avgScoreColor(avg) {
  if (avg >= 90) return 'success';
  if (avg >= 75) return 'primary';
  if (avg >= 60) return 'warning';
  return 'danger';
}

export default function Grades() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentGrades />;
  if (hasRole('parent')) return <ParentGradesView />;
  return <GradesAdmin />;
}

function GradesAdmin() {
  const { t } = useTranslation();
  const { hasRole } = useAuthStore();
  const readOnly = hasRole('parent');
  const isAdmin = hasRole('super_admin', 'admin');
  const [grades, setGrades] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState({ total: 0, average: '0', exams: 0, projects: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courses, setCourses] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bulletinStudent, setBulletinStudent] = useState(null);
  const [statsGrades, setStatsGrades] = useState([]);

  const typeLabels = useMemo(
    () => ({
      exam: t('gradesPage.typeExam'),
      quiz: t('gradesPage.typeQuiz'),
      homework: t('gradesPage.typeHomework'),
      assignment: t('gradesPage.typeHomework'),
      project: t('gradesPage.typeProject'),
    }),
    [t]
  );

  const typeOptions = useMemo(
    () => [
      { value: '', label: t('common.allTypes') },
      { value: 'exam', label: t('gradesPage.typeExam') },
      { value: 'quiz', label: t('gradesPage.typeQuiz') },
      { value: 'homework', label: t('gradesPage.typeHomework') },
      { value: 'project', label: t('gradesPage.typeProject') },
    ],
    [t]
  );

  const formatTypeLabel = useCallback(
    (gradeType) => typeLabels[gradeType] || gradeType || '—',
    [typeLabels]
  );

  useEffect(() => {
    coursesAPI.list({ per_page: 100 }).then((res) => setCourses(res.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [courseId, type, debouncedSearch]);

  const filterParams = useMemo(
    () => ({
      ...(courseId && { course_id: courseId }),
      ...(type && { type }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [courseId, type, debouncedSearch]
  );

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await gradesAPI.stats(filterParams);
      setStats({
        total: data.total ?? 0,
        average: Number(data.average ?? 0).toFixed(1),
        exams: data.exams ?? 0,
        projects: data.projects ?? 0,
      });
    } catch {
      /* keep previous stats */
    } finally {
      setStatsLoading(false);
    }
  }, [filterParams]);

  const fetchOverviewGrades = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await gradesAPI.list({ per_page: 100, ...filterParams });
      setStatsGrades(data.data ?? []);
    } catch {
      setStatsGrades([]);
    }
  }, [filterParams, isAdmin]);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: 15,
        ...filterParams,
      };
      const { data } = await gradesAPI.list(params);
      setGrades(data.data ?? []);
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      });
    } catch (err) {
      const status = err.response?.status;
      const isTimeout =
        err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
      if (isTimeout || !err.response) {
        toast.error(t('gradesPage.loadTimeout'));
      } else if (status >= 500) {
        toast.error(t('gradesPage.loadServerError'));
      } else {
        toast.error(err.response?.data?.message || t('gradesPage.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterParams, t]);

  useEffect(() => {
    fetchStats();
    fetchOverviewGrades();
  }, [fetchStats, fetchOverviewGrades]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const refresh = () => {
    fetchStats();
    fetchOverviewGrades();
    fetchGrades();
  };

  const avgColor = useMemo(() => avgScoreColor(Number(stats.average)), [stats.average]);

  const pageStudentIds = useMemo(() => {
    const ids = new Set();
    grades.forEach((g) => {
      if (g.student?.id) ids.add(g.student.id);
    });
    return [...ids];
  }, [grades]);

  const overviewStudents = useMemo(() => {
    const byId = new Map();
    [...statsGrades, ...grades].forEach((g) => {
      if (g.student?.id && !byId.has(g.student.id)) {
        byId.set(g.student.id, g.student);
      }
    });
    return [...byId.values()]
      .sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''))
      .slice(0, 50);
  }, [statsGrades, grades]);

  const overviewStudentIds = useMemo(
    () => overviewStudents.map((s) => s.id),
    [overviewStudents]
  );

  const { statusMap, loading: statusLoading, updateStatus } = useBulletinStatusMap(
    isAdmin ? [...new Set([...pageStudentIds, ...overviewStudentIds])] : []
  );

  const columns = useMemo(
    () => [
      {
        key: 'student',
        label: t('gradesPage.columnStudent'),
        render: (_, row) => row.student?.user?.name || '—',
      },
      {
        key: 'course',
        label: t('gradesPage.columnCourse'),
        render: (_, row) => (
          <div>
            <p className="font-medium">{row.course?.name}</p>
            <p className="font-mono text-xs text-primary-500">{row.course?.code}</p>
          </div>
        ),
      },
      {
        key: 'type',
        label: t('gradesPage.columnType'),
        render: (val) => (
          <Badge color={TYPE_BADGE[val] || 'gray'} size="xs">{formatTypeLabel(val)}</Badge>
        ),
      },
      { key: 'title', label: t('gradesPage.columnTitle') },
      {
        key: 'score',
        label: t('gradesPage.columnScore'),
        render: (_, row) => (
          <span className="font-mono text-sm">
            {row.score}/{row.max_score}
          </span>
        ),
      },
      {
        key: 'grade',
        label: t('gradesPage.columnGrade'),
        render: (_, row) => (
          <GradeTag
            grade={row.letter_grade || '—'}
            percentage={row.percentage ?? 0}
          />
        ),
      },
      {
        key: 'graded_at',
        label: t('gradesPage.columnDate'),
        render: (val) =>
          val
            ? new Date(val).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—',
      },
      ...(isAdmin
        ? [
            {
              key: 'bulletin_status',
              label: t('gradesPage.columnBulletin'),
              render: (_, row) => (
                <BulletinStatusBadge
                  status={statusMap[row.student?.id]}
                  loading={statusLoading && !statusMap[row.student?.id]}
                />
              ),
            },
          ]
        : []),
      {
        key: 'actions',
        label: t('common.actions'),
        render: readOnly
          ? () => null
          : (_, row) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isAdmin && row.student?.id && (
              <button
                type="button"
                onClick={() => setBulletinStudent(row.student)}
                className="p-2 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-500/10 active:scale-95 transition-all"
                title={t('gradesPage.academicBulletin')}
                aria-label={t('gradesPage.academicBulletin')}
              >
                <FontAwesomeIcon icon={faFilePdf} className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row);
              }}
              className="p-2 rounded-lg text-surface-400 hover:text-danger-500 hover:bg-danger-500/10"
              aria-label={t('gradesPage.deleteGradeAria')}
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ].filter((col) => !(readOnly && col.key === 'actions')),
    [t, isAdmin, readOnly, formatTypeLabel, statusMap, statusLoading]
  );

  const emptyMessage = useMemo(() => {
    if (debouncedSearch || courseId || type) {
      return t('gradesPage.emptyFiltered');
    }
    return t('gradesPage.emptyDemo');
  }, [debouncedSearch, courseId, type, t]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('gradesPage.title')}
        subtitle={
          isAdmin
            ? t('gradesPage.adminSubtitle')
            : t('gradesPage.subtitle')
        }
        actions={
          readOnly ? null : (
            <Button size="sm" icon={faPlus} onClick={() => setModalOpen(true)}>
              {t('gradesPage.recordGrade')}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStatCard
          title={t('gradesPage.statsTotal')}
          value={stats.total}
          icon={faClipboardList}
          color="primary"
          loading={statsLoading}
        />
        <MiniStatCard
          title={t('gradesPage.statsAverage')}
          value={`${stats.average}%`}
          icon={faChartLine}
          color={avgColor}
          loading={statsLoading}
        />
        <MiniStatCard
          title={t('gradesPage.statsExams')}
          value={stats.exams}
          icon={faFileLines}
          color="warning"
          loading={statsLoading}
        />
        <MiniStatCard
          title={t('gradesPage.statsProjects')}
          value={stats.projects}
          icon={faProjectDiagram}
          color="info"
          loading={statsLoading}
        />
      </div>

      {isAdmin && overviewStudents.length > 0 && (
        <Card
          title={t('gradesPage.bulletinsTitle')}
          subtitle={t('gradesPage.bulletinsSubtitle')}
        >
          <p className="text-xs text-surface-500 mb-4">
            {t('gradesPage.bulletinsWorkflow')}
            {overviewStudents.length >= 50 && ` ${t('gradesPage.bulletinsShowingLimit')}`}
          </p>
          <div className="responsive-table-wrap -mx-2 sm:mx-0">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 text-xs uppercase tracking-wider text-surface-500">
                  <th className="text-start py-2 pe-4">{t('gradesPage.columnStudent')}</th>
                  <th className="text-start py-2 pe-4">{t('common.id')}</th>
                  <th className="text-start py-2 pe-4">{t('gradesPage.bulletinStatus')}</th>
                  <th className="text-end py-2">{t('common.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {overviewStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-surface-50/80 dark:hover:bg-surface-800/40">
                    <td className="py-3 pe-4 font-medium text-surface-900 dark:text-white">
                      {student.user?.name || '—'}
                    </td>
                    <td className="py-3 pe-4 font-mono text-xs text-surface-500">
                      {student.student_id || '—'}
                    </td>
                    <td className="py-3 pe-4">
                      <BulletinStatusBadge
                        status={statusMap[student.id]}
                        loading={statusLoading && !statusMap[student.id]}
                      />
                    </td>
                    <td className="py-3 text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={faFilePdf}
                        onClick={() => setBulletinStudent(student)}
                      >
                        {t('gradesPage.bulletinButton')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card padding={false}>
        <div className="p-4 flex flex-wrap gap-3 border-b border-surface-100 dark:border-surface-800">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('gradesPage.searchPlaceholder')}
            className="w-full sm:flex-1 sm:min-w-[200px] rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <Select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full sm:w-56"
          >
            <option value="">{t('common.allCourses')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-full sm:w-40">
            {typeOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <Table
          columns={columns}
          data={grades}
          loading={loading}
          emptyMessage={emptyMessage}
        />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <GradeFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refresh}
        defaultCourseId={courseId}
      />

      <BulletinWorkflowModal
        isOpen={!!bulletinStudent}
        onClose={() => setBulletinStudent(null)}
        student={bulletinStudent}
        onStatusChange={(studentId, payload) => updateStatus(studentId, payload)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { data } = await gradesAPI.delete(deleteTarget.id);
            toast.success(data.message || t('gradesPage.deleted'));
            setDeleteTarget(null);
            refresh();
          } catch {
            toast.error(t('gradesPage.deleteFailed'));
          } finally {
            setDeleting(false);
          }
        }}
        title={t('gradesPage.deleteGrade')}
        message={t('gradesPage.deleteConfirm', { title: deleteTarget?.title })}
        loading={deleting}
      />
    </div>
  );
}
