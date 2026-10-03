import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPenToSquare,
  faTrash,
  faBook,
  faTableCells,
  faList,
} from '@fortawesome/free-solid-svg-icons';
import { coursesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import StudentCourses from '../student/StudentCourses';
import {
  PageHeader,
  Card,
  SearchBar,
  Table,
  Pagination,
  Badge,
  Avatar,
  Button,
  ConfirmDialog,
} from '../../components/common/UI';
import CourseFormModal from '../../components/courses/CourseFormModal';

const COVER_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
];

const GRADE_LEVEL_KEYS = {
  'Grade 9': 'common.grade9',
  'Grade 10': 'common.grade10',
  'Grade 11': 'common.grade11',
  'Grade 12': 'common.grade12',
};

function statusColor(status) {
  const map = { active: 'success', inactive: 'gray', archived: 'warning' };
  return map[status] || 'gray';
}

export default function Courses() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentCourses />;
  const canManage = hasRole('admin') || hasRole('super_admin');
  return <CoursesAdmin canManage={canManage} />;
}

function CoursesAdmin({ canManage }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const formatGradeLevel = useCallback(
    (level) => (level && GRADE_LEVEL_KEYS[level] ? t(GRADE_LEVEL_KEYS[level]) : level),
    [t]
  );

  const formatStatus = useCallback(
    (status) => {
      const map = {
        active: t('common.active'),
        inactive: t('common.inactive'),
        archived: t('common.archived'),
      };
      return map[status] || status;
    },
    [t]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: view === 'grid' ? 12 : 15,
        ...(debouncedSearch && { search: debouncedSearch }),
      };
      const { data } = await coursesAPI.list(params);
      setCourses(data.data ?? []);
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      });
    } catch {
      toast.error(t('courses.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, view, t]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: t('common.course'),
        render: (_, row) => (
          <div>
            <p className="font-medium text-surface-900 dark:text-white">{row.name}</p>
            <p className="font-mono text-xs text-primary-500">{row.code}</p>
          </div>
        ),
      },
      {
        key: 'teacher',
        label: t('teachers.columnTeacher'),
        render: (_, row) => row.teacher?.user?.name || '—',
      },
      {
        key: 'grade_level',
        label: t('courses.columnGrade'),
        render: (val) => formatGradeLevel(val),
      },
      {
        key: 'students',
        label: t('common.students'),
        render: (_, row) => row.students_count ?? 0,
      },
      {
        key: 'credits',
        label: t('common.credits'),
      },
      {
        key: 'status',
        label: t('common.status'),
        render: (val) => (
          <Badge color={statusColor(val)} size="xs">{formatStatus(val)}</Badge>
        ),
      },
      {
        key: 'actions',
        label: t('common.actions'),
        render: (_, row) => (
          canManage ? (
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
          ) : null
        ),
      },
    ],
    [t, canManage, formatGradeLevel, formatStatus]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('courses.title')}
        subtitle={canManage ? t('courses.subtitle') : t('courses.viewSubtitle')}
        actions={(
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-surface-200 dark:border-surface-700 p-1">
              <button type="button" onClick={() => setView('grid')}
                className={`p-2 rounded-lg text-sm transition-colors ${view === 'grid' ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
                title={t('courses.gridView')} aria-label={t('courses.gridView')}>
                <FontAwesomeIcon icon={faTableCells} className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setView('table')}
                className={`p-2 rounded-lg text-sm transition-colors ${view === 'table' ? 'bg-primary-500 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
                title={t('courses.tableView')} aria-label={t('courses.tableView')}>
                <FontAwesomeIcon icon={faList} className="w-4 h-4" />
              </button>
            </div>
            {canManage && (
              <Button icon={faPlus} onClick={() => { setEditing(null); setModalOpen(true); }}>
                {t('courses.addCourse')}
              </Button>
            )}
          </div>
        )}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t('courses.searchPlaceholder')} className="w-full sm:w-72" />
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse" />
              ))
            : courses.map((course, index) => (
                <div
                  key={course.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/courses/${course.id}`)}
                  className="group bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700/50 overflow-hidden hover:shadow-card-hover transition-all cursor-pointer"
                >
                  <div className={`relative h-32 bg-gradient-to-br ${COVER_GRADIENTS[index % 6]} p-4`}>
                    <span className="absolute top-3 left-3 font-mono text-xs font-bold text-white/90 bg-black/20 backdrop-blur px-2 py-1 rounded-lg">
                      {course.code}
                    </span>
                    <span className="absolute top-3 right-3">
                      <Badge color={statusColor(course.status)} size="xs">
                        {formatStatus(course.status)}
                      </Badge>
                    </span>
                    <FontAwesomeIcon
                      icon={faBook}
                      className="absolute bottom-2 right-3 w-16 h-16 text-white/15"
                    />
                    <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 gap-1 p-2 justify-end">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(course); setModalOpen(true); }}
                        className="p-2 rounded-lg bg-white/90 text-surface-700 hover:text-primary-500">
                        <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(course); }}
                        className="p-2 rounded-lg bg-white/90 text-surface-700 hover:text-danger-500">
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-surface-900 dark:text-white line-clamp-1">{course.name}</h3>
                    <p className="text-xs text-surface-500 mt-1 line-clamp-2 min-h-[2rem]">
                      {course.description || t('courses.noDescription')}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100 dark:border-surface-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={course.teacher?.user?.name} size="xs" />
                        <span className="text-xs text-surface-500 truncate">
                          {course.teacher?.user?.name || t('courses.unassigned')}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-surface-600 dark:text-surface-400 flex-shrink-0">
                        {t('courses.studentsCount', { count: course.students_count ?? 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      ) : (
        <Card padding={false}>
          <Table
            columns={columns}
            data={courses}
            loading={loading}
            emptyMessage={t('courses.empty')}
            onRowClick={(row) => navigate(`/courses/${row.id}`)}
          />
        </Card>
      )}

      {meta && meta.last_page > 1 && (
        <Card padding={false}>
          <Pagination meta={meta} onPageChange={setPage} />
        </Card>
      )}

      {canManage && (
        <>
      <CourseFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        course={editing}
        onSuccess={fetchCourses}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { data } = await coursesAPI.delete(deleteTarget.id);
            toast.success(data.message || t('courses.deleted'));
            setDeleteTarget(null);
            fetchCourses();
          } catch {
            toast.error(t('common.deleteFailed'));
          } finally {
            setDeleting(false);
          }
        }}
        title={t('courses.deleteCourse')}
        message={t('courses.deleteConfirm', { name: deleteTarget?.name })}
        loading={deleting}
      />
        </>
      )}
    </div>
  );
}
