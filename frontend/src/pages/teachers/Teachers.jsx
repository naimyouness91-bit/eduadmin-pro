import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faPenToSquare,
  faTrash,
  faUsers,
  faBriefcase,
  faClock,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import { teachersAPI } from '../../services/api';
import { DEPARTMENTS } from '../../components/teachers/TeacherFormModal';
import {
  PageHeader,
  Card,
  SearchBar,
  Select,
  Table,
  Pagination,
  Badge,
  Avatar,
  Button,
  ConfirmDialog,
} from '../../components/common/UI';
import MiniStatCard from '../../components/common/MiniStatCard';
import TeacherFormModal from '../../components/teachers/TeacherFormModal';

function employmentBadge(type) {
  const map = { full_time: 'success', part_time: 'warning', contract: 'info' };
  return map[type] || 'gray';
}

export default function Teachers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [teachers, setTeachers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState({ total: 0, fullTime: 0, partTime: 0, avgExperience: '0' });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const formatEmployment = useCallback(
    (type) => {
      if (!type) return '—';
      const map = {
        full_time: t('teachers.employmentFullTime'),
        part_time: t('teachers.employmentPartTime'),
        contract: t('teachers.employmentContract'),
      };
      return map[type] || type;
    },
    [t]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, department]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [totalRes, fullRes, partRes, allRes] = await Promise.all([
        teachersAPI.list({ per_page: 1 }),
        teachersAPI.list({ employment_type: 'full_time', per_page: 1 }),
        teachersAPI.list({ employment_type: 'part_time', per_page: 1 }),
        teachersAPI.list({ per_page: 100 }),
      ]);
      const list = allRes.data.data ?? [];
      const avg =
        list.length > 0
          ? (
              list.reduce((s, teacher) => s + (Number(teacher.experience_years) || 0), 0) / list.length
            ).toFixed(1)
          : '0';
      setStats({
        total: totalRes.data.total ?? 0,
        fullTime: fullRes.data.total ?? 0,
        partTime: partRes.data.total ?? 0,
        avgExperience: avg,
      });
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: 15,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(department && { department }),
      };
      const { data } = await teachersAPI.list(params);
      setTeachers(data.data ?? []);
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      });
    } catch {
      toast.error(t('teachers.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, department, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const refresh = () => {
    fetchStats();
    fetchTeachers();
  };

  const columns = useMemo(
    () => [
      {
        key: 'teacher',
        label: t('teachers.columnTeacher'),
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <Avatar src={row.user?.avatar_url} name={row.user?.name} size="sm" />
            <div className="min-w-0">
              <p className="font-medium text-surface-900 dark:text-white truncate">{row.user?.name}</p>
              <p className="text-xs text-surface-400 truncate">{row.user?.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'teacher_id',
        label: t('common.id'),
        render: (val) => <span className="font-mono text-xs">{val}</span>,
      },
      { key: 'specialization', label: t('teachers.columnSpecialization') },
      {
        key: 'department',
        label: t('common.department'),
        render: (val) => (
          <Badge color="primary" size="xs">{val || '—'}</Badge>
        ),
      },
      {
        key: 'experience_years',
        label: t('teachers.columnExperience'),
        render: (val) => (val != null ? t('teachers.experienceYears', { count: val }) : '—'),
      },
      {
        key: 'employment_type',
        label: t('common.type'),
        render: (val) => (
          <Badge color={employmentBadge(val)} size="xs">{formatEmployment(val)}</Badge>
        ),
      },
      {
        key: 'actions',
        label: t('common.actions'),
        render: (_, row) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(row); setModalOpen(true); }}
              className="p-2 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-500/10">
              <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
              className="p-2 rounded-lg text-surface-400 hover:text-danger-500 hover:bg-danger-500/10">
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [t, formatEmployment]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('teachers.title')}
        subtitle={t('teachers.subtitle')}
        actions={
          <Button icon={faUserPlus} onClick={() => { setEditing(null); setModalOpen(true); }}>
            {t('teachers.addTeacher')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStatCard title={t('teachers.statsTotal')} value={stats.total} icon={faUsers} color="primary" loading={statsLoading} />
        <MiniStatCard title={t('teachers.statsFullTime')} value={stats.fullTime} icon={faBriefcase} color="success" loading={statsLoading} />
        <MiniStatCard title={t('teachers.statsPartTime')} value={stats.partTime} icon={faClock} color="warning" loading={statsLoading} />
        <MiniStatCard title={t('teachers.statsAvgExperience')} value={t('teachers.experienceYears', { count: stats.avgExperience })} icon={faChartLine} color="info" loading={statsLoading} />
      </div>

      <Card padding={false}>
        <div className="p-4 flex flex-col lg:flex-row gap-3 border-b border-surface-100 dark:border-surface-800">
          <SearchBar value={search} onChange={setSearch} placeholder={t('teachers.searchPlaceholder')} className="w-full lg:w-72" />
          <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full lg:w-56 lg:ml-auto">
            <option value="">{t('common.allDepartments')}</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </div>
        <Table columns={columns} data={teachers} loading={loading} emptyMessage={t('teachers.empty')} onRowClick={(row) => navigate(`/teachers/${row.id}`)} />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <TeacherFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} teacher={editing} onSuccess={refresh} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { data } = await teachersAPI.delete(deleteTarget.id);
            toast.success(data.message || t('teachers.deleted'));
            setDeleteTarget(null);
            refresh();
          } catch {
            toast.error(t('common.deleteFailed'));
          } finally {
            setDeleting(false);
          }
        }}
        title={t('teachers.deleteTeacher')}
        message={t('teachers.deleteConfirm', { name: deleteTarget?.user?.name })}
        loading={deleting}
      />
    </div>
  );
}
