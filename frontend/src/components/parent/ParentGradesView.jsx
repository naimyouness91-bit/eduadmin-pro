import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  faClipboardList,
  faChartLine,
  faFileLines,
  faProjectDiagram,
} from '@fortawesome/free-solid-svg-icons';
import { parentAPI } from '../../services/api';
import useParentChildren from '../../hooks/useParentChildren';
import {
  PageHeader,
  Card,
  Select,
  Table,
  Pagination,
  Badge,
  FormField,
  GradeTag,
} from '../common/UI';
import MiniStatCard from '../common/MiniStatCard';

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

export default function ParentGradesView() {
  const { t } = useTranslation();
  const { children, selectedId, setSelectedId, student, studentId, loading: childrenLoading } =
    useParentChildren();

  const [grades, setGrades] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState({ total: 0, average: '0', exams: 0, projects: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');

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

  const filterParams = useMemo(
    () => ({
      ...(type && { type }),
    }),
    [type]
  );

  const fetchStats = useCallback(async () => {
    if (!studentId) return;
    setStatsLoading(true);
    try {
      const { data } = await parentAPI.childGradeStats(studentId, filterParams);
      const payload = data.data ?? data;
      setStats({
        total: payload.total ?? 0,
        average: Number(payload.average ?? 0).toFixed(1),
        exams: payload.exams ?? 0,
        projects: payload.projects ?? 0,
      });
    } catch {
      setStats({ total: 0, average: '0', exams: 0, projects: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, [studentId, filterParams]);

  const fetchGrades = useCallback(async () => {
    if (!studentId) {
      setGrades([]);
      setMeta(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await parentAPI.childGrades(studentId, {
        page,
        per_page: 15,
        ...filterParams,
      });
      setGrades(data.data ?? []);
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || t('gradesPage.loadError'));
      setGrades([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, page, filterParams, t]);

  useEffect(() => setPage(1), [studentId, type]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const avgColor = useMemo(() => avgScoreColor(Number(stats.average)), [stats.average]);

  const columns = useMemo(
    () => [
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
          <Badge color={TYPE_BADGE[val] || 'gray'} size="xs">
            {typeLabels[val] || val}
          </Badge>
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
          <GradeTag grade={row.letter_grade || '—'} percentage={row.percentage ?? 0} />
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
    ],
    [t, typeLabels]
  );

  if (childrenLoading) {
    return <div className="h-48 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />;
  }

  if (!children.length) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title={t('gradesPage.title')} subtitle={t('gradesPage.parentSubtitle')} />
        <Card>
          <p className="text-sm text-surface-500">{t('bulletin.noChildren')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in page-content-safe">
      <PageHeader
        title={t('gradesPage.title')}
        subtitle={t('gradesPage.parentSubtitle', {
          name: student?.user?.name ?? '',
        })}
      />

      {children.length > 1 && (
        <Card className="max-w-md">
          <FormField label={t('bulletin.selectChild')}>
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {children.map((c) => {
                const s = c.student ?? c;
                return (
                  <option key={s.id} value={s.id}>
                    {s.user?.name ?? s.name} ({s.student_id})
                  </option>
                );
              })}
            </Select>
          </FormField>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="min-w-[10rem]">
          {typeOptions.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stat-cards-grid" data-cols="4">
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

      <Card padding={false}>
        <Table
          columns={columns}
          data={grades}
          loading={loading}
          emptyMessage={t('gradesPage.emptyFiltered')}
        />
        {meta && meta.last_page > 1 && (
          <div className="p-4 border-t border-surface-200/60 dark:border-surface-700/60">
            <Pagination
              currentPage={meta.current_page}
              totalPages={meta.last_page}
              onPageChange={setPage}
              from={meta.from}
              to={meta.to}
              total={meta.total}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
