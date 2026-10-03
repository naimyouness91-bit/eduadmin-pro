import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faPenToSquare,
  faEye,
  faTrash,
  faUsers,
  faUserCheck,
  faUserSlash,
  faGraduationCap,
  faDownload,
  faUpload,
  faRotateRight,
  faFilterCircleXmark,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { studentsAPI } from '../../services/api';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { exportStudentsCsv, parseStudentsCsv } from '../../utils/studentCsv';
import {
  PageHeader,
  Card,
  Select,
  Pagination,
  Badge,
  Avatar,
  Button,
  ConfirmDialog,
} from '../../components/common/UI';
import StudentsSearchBar from '../../components/students/StudentsSearchBar';
import StudentsTable from '../../components/students/StudentsTable';
import StudentFormModal from '../../components/students/StudentFormModal';

function statusBadge(status) {
  return { active: 'success', inactive: 'gray', graduated: 'primary' }[status] || 'gray';
}

function AnimatedStatCard({ title, value, icon, color, loading }) {
  const animated = useAnimatedCounter(loading ? 0 : value);
  const styles = {
    primary: 'border-primary-500/20 bg-primary-500/5 hover:border-primary-500/40',
    success: 'border-success-500/20 bg-success-500/5 hover:border-success-500/40',
    warning: 'border-warning-500/20 bg-warning-500/5 hover:border-warning-500/40',
    info: 'border-info-500/20 bg-info-500/5 hover:border-info-500/40',
  };
  const iconStyles = {
    primary: 'text-primary-500 bg-primary-500/10',
    success: 'text-success-500 bg-success-500/10',
    warning: 'text-warning-500 bg-warning-500/10',
    info: 'text-info-500 bg-info-500/10',
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 animate-pulse h-[88px]">
        <div className="h-3 w-20 bg-surface-200 dark:bg-surface-700 rounded mb-3" />
        <div className="h-7 w-12 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-default ${styles[color]}`}
    >
      <div>
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{title}</p>
        <p className="font-display text-2xl font-bold text-surface-900 dark:text-white mt-1 tabular-nums">
          {animated}
        </p>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${iconStyles[color]}`}>
        <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      </div>
    </div>
  );
}

export default function Students() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const importRef = useRef(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, graduated: 0 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSearching = search !== debouncedSearch;
  const hasFilters = !!(gradeLevel || section || status || debouncedSearch);

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: '', label: t('common.allStatuses') },
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
      { value: 'graduated', label: t('common.graduated') },
    ],
    [t]
  );

  const GRADE_OPTIONS = useMemo(
    () => [
      { value: '', label: t('common.allGrades') },
      { value: 'Grade 9', label: t('common.grade9') },
      { value: 'Grade 10', label: t('common.grade10') },
      { value: 'Grade 11', label: t('common.grade11') },
      { value: 'Grade 12', label: t('common.grade12') },
    ],
    [t]
  );

  const SECTION_OPTIONS = useMemo(
    () => [
      { value: '', label: t('common.allSections') },
      { value: 'A', label: t('common.sectionA') },
      { value: 'B', label: t('common.sectionB') },
      { value: 'C', label: t('common.sectionC') },
      { value: 'D', label: t('common.sectionD') },
    ],
    [t]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, gradeLevel, section, status, sortBy, sortDir]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await studentsAPI.stats();
      setStats({
        total: data.total ?? 0,
        active: data.active ?? 0,
        inactive: data.inactive ?? 0,
        graduated: data.graduated ?? 0,
      });
    } catch {
      /* keep previous */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: 15,
        sort_by: sortBy,
        sort_dir: sortDir,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(gradeLevel && { grade_level: gradeLevel }),
        ...(section && { section }),
        ...(status && { enrollment_status: status }),
      };
      const { data } = await studentsAPI.list(params);
      setStudents(data.data ?? []);
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      });
    } catch (err) {
      const message = err.response?.data?.message;
      if (err.response?.status === 403) {
        toast.error(message || t('students.accessDenied'));
      } else if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
        toast.error(t('students.requestTimeout'));
      } else if (!err.response) {
        toast.error(t('students.cannotReachApi'));
      } else {
        toast.error(message || t('students.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, gradeLevel, section, status, sortBy, sortDir, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (!inInput && e.key === 'n') {
        e.preventDefault();
        openCreate();
      }
      if (e.key === 'Escape') {
        setModalOpen(false);
        setDeleteTarget(null);
        setBulkDeleteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleRefresh = () => {
    fetchStats();
    fetchStudents();
    toast.success(t('students.refreshed'));
  };

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setGradeLevel('');
    setSection('');
    setStatus('');
    setPage(1);
    toast.success(t('students.filtersCleared'));
  };

  const openCreate = () => {
    setEditingStudent(null);
    setModalOpen(true);
  };

  const openEdit = (student, e) => {
    e?.stopPropagation();
    setEditingStudent(student);
    setModalOpen(true);
  };

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? students.map((s) => s.id) : []);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data } = await studentsAPI.delete(deleteTarget.id);
      toast.success(data.message || t('students.deleted'));
      setDeleteTarget(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      handleRefresh();
    } catch {
      toast.error(t('students.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => studentsAPI.delete(id)));
      toast.success(t('students.bulkDeleted', { count: selectedIds.length }));
      setBulkDeleteOpen(false);
      setSelectedIds([]);
      handleRefresh();
    } catch {
      toast.error(t('students.bulkDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await studentsAPI.list({ per_page: 500, ...(status && { enrollment_status: status }) });
      exportStudentsCsv(data.data ?? []);
      toast.success(t('students.exportDownloaded'));
    } catch {
      toast.error(t('students.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseStudentsCsv(text);
      if (!rows.length) {
        toast.error(t('students.noValidCsvRows'));
        return;
      }
      let ok = 0;
      for (const row of rows) {
        try {
          await studentsAPI.create(row);
          ok += 1;
        } catch {
          /* skip duplicates */
        }
      }
      toast.success(t('students.importedCount', { ok, total: rows.length }));
      handleRefresh();
    } catch {
      toast.error(t('students.importFailed'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const columns = useMemo(() => [
    {
      key: 'student',
      label: t('students.columnStudent'),
      sortKey: 'name',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.user?.avatar_url} name={row.user?.name} size="sm" />
          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/students/${row.id}`);
              }}
              className="font-medium text-surface-900 dark:text-white truncate text-left hover:text-primary-500 transition-colors"
            >
              {row.user?.name}
            </button>
            <p className="text-xs text-surface-400 truncate">{row.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'student_id',
      label: t('common.id'),
      sortKey: 'student_id',
      render: (val) => (
        <span className="font-mono text-xs text-surface-600 dark:text-surface-400">{val}</span>
      ),
    },
    {
      key: 'grade',
      label: t('students.columnGrade'),
      sortKey: 'grade_level',
      render: (_, row) => (
        <span className="text-sm">
          {row.grade_level || '—'}
          {row.section ? ` · ${row.section}` : ''}
        </span>
      ),
    },
    {
      key: 'enrollment_status',
      label: t('students.columnStatus'),
      sortKey: 'enrollment_status',
      render: (val) => (
        <Badge color={statusBadge(val)} dot>
          {val ? t(`common.${val}`, val) : '—'}
        </Badge>
      ),
    },
    {
      key: 'enrollment_date',
      label: t('students.columnEnrolled'),
      sortKey: 'enrollment_date',
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : '—',
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (_, row) => (
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${row.id}`);
            }}
            className="p-2 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-500/10 active:scale-95 transition-all"
            aria-label={t('students.viewDetails')}
            title={t('students.viewDetailsTitle')}
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => openEdit(row, e)}
            className="p-2 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-500/10 active:scale-95 transition-all"
            aria-label={t('common.edit')}
          >
            <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="p-2 rounded-lg text-surface-400 hover:text-danger-500 hover:bg-danger-500/10 active:scale-95 transition-all"
            aria-label={t('common.delete')}
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], [t, navigate]);

  const emptyMessage = hasFilters ? t('students.noResults') : t('students.empty');
  const emptyDescription = hasFilters ? t('students.emptyHint') : t('students.emptyStart');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('students.title')}
        subtitle={t('students.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" icon={faRotateRight} onClick={handleRefresh}>
              {t('common.refresh')}
            </Button>
            <Button variant="outline" size="sm" icon={faDownload} loading={exporting} onClick={handleExport}>
              {t('common.export')}
            </Button>
            <Button variant="outline" size="sm" icon={faUpload} loading={importing} onClick={() => importRef.current?.click()}>
              {t('common.importCsv')}
            </Button>
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button icon={faUserPlus} onClick={openCreate}>
              {t('students.addStudent')}
            </Button>
          </div>
        }
      />

      <p className="text-xs text-surface-400 -mt-4">
        {t('students.shortcutsPrefix')}{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800">Ctrl+K</kbd>{' '}
        {t('students.shortcutsSearch')} ·{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800">N</kbd>{' '}
        {t('students.shortcutsNew')} · {t('students.shortcutsProfile')}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatedStatCard title={t('students.statsTotal')} value={stats.total} icon={faUsers} color="primary" loading={statsLoading} />
        <AnimatedStatCard title={t('students.statsActive')} value={stats.active} icon={faUserCheck} color="success" loading={statsLoading} />
        <AnimatedStatCard title={t('students.statsInactive')} value={stats.inactive} icon={faUserSlash} color="warning" loading={statsLoading} />
        <AnimatedStatCard title={t('students.statsGraduated')} value={stats.graduated} icon={faGraduationCap} color="info" loading={statsLoading} />
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 animate-slide-up">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {t('students.selectedCount', { count: selectedIds.length })}
          </span>
          <Button variant="danger" size="sm" icon={faTrashCan} onClick={() => setBulkDeleteOpen(true)}>
            {t('students.deleteSelected')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            {t('students.clearSelection')}
          </Button>
        </div>
      )}

      <Card padding={false}>
        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-surface-100 dark:border-surface-800">
          <StudentsSearchBar
            inputRef={searchRef}
            value={search}
            onChange={setSearch}
            onClear={() => {
              setSearch('');
              setDebouncedSearch('');
            }}
            searching={isSearching || loading}
            className="w-full lg:flex-1 lg:max-w-md"
          />
          <div className="flex flex-wrap gap-2 flex-1 lg:justify-end items-center">
            <Select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full sm:w-40 transition-all">
              {GRADE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select value={section} onChange={(e) => setSection(e.target.value)} className="w-full sm:w-36">
              {SECTION_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" icon={faFilterCircleXmark} onClick={resetFilters}>
                {t('students.reset')}
              </Button>
            )}
          </div>
        </div>

        <StudentsTable
          columns={columns}
          data={students}
          loading={loading}
          emptyMessage={emptyMessage}
          emptyDescription={emptyDescription}
          emptyAction={
            !hasFilters ? (
              <Button icon={faUserPlus} onClick={openCreate}>{t('students.addStudent')}</Button>
            ) : (
              <Button variant="outline" onClick={resetFilters}>{t('students.clearFilters')}</Button>
            )
          }
          onRowClick={(row) => navigate(`/students/${row.id}`)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          selectedIds={selectedIds}
          onSelectRow={toggleSelect}
          onSelectAll={toggleSelectAll}
        />
        <Pagination meta={meta} onPageChange={setPage} />
      </Card>

      <StudentFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStudent(null);
        }}
        student={editingStudent}
        onSuccess={handleRefresh}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('students.deleteStudent')}
        subjectName={deleteTarget?.user?.name}
        description={t('students.deleteConfirmRecords')}
        confirmLabel={t('students.deleteStudent')}
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={t('students.deleteSelectedTitle')}
        message={t('students.deleteSelectedMessage', { count: selectedIds.length })}
        confirmLabel={t('students.deleteAll')}
        loading={deleting}
      />
    </div>
  );
}
