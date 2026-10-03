import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList,
  faPlus,
  faPenToSquare,
  faTrash,
  faDownload,
  faTableCells,
  faGrip,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { assignmentsAPI, coursesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import StudentAssignments from '../student/StudentAssignments';
import ParentAssignmentsView from '../../components/parent/ParentAssignmentsView';
import {
  PageHeader,
  SearchBar,
  Card,
  Badge,
  Button,
  EmptyState,
  ConfirmDialog,
  Table,
  Select,
  Modal,
  FormField,
  Input,
  Textarea,
} from '../../components/common/UI';
import AssignmentFormModal from '../../components/assignments/AssignmentFormModal';
import { formatDueDate, statusMeta } from '../../components/assignments/assignmentUtils';

export default function Assignments() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentAssignments />;
  if (hasRole('parent')) return <ParentAssignmentsView />;
  return <AssignmentsManage />;
}

function AssignmentsManage() {
  const { t } = useTranslation();
  const { hasRole } = useAuthStore();
  const canEdit = hasRole('teacher') || hasRole('admin') || hasRole('super_admin');
  const isAdmin = hasRole('admin') || hasRole('super_admin');

  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [view, setView] = useState('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submissionsOpen, setSubmissionsOpen] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ score: '', feedback: '' });
  const [reviewSaving, setReviewSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (courseFilter) params.course_id = courseFilter;
      const { data } = await assignmentsAPI.list(params);
      setAssignments(data.data ?? []);
    } catch {
      toast.error(t('assignmentsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [courseFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    coursesAPI.list({ per_page: 100 }).then((res) => setCourses(res.data.data ?? [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.course?.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
    );
  }, [assignments, search]);

  const openSubmissions = async (assignment) => {
    setSubmissionsOpen(assignment);
    setSubmissionsLoading(true);
    try {
      const { data } = await assignmentsAPI.submissions(assignment.id, { per_page: 100 });
      setSubmissions(data.data ?? []);
    } catch {
      toast.error(t('assignmentsPage.submissionsLoadFailed'));
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assignmentsAPI.delete(deleteTarget.id);
      toast.success(t('assignmentsPage.deleted'));
      setDeleteTarget(null);
      load();
    } catch {
      toast.error(t('assignmentsPage.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAttachment = async (a) => {
    try {
      await assignmentsAPI.downloadAttachment(a.id, a.attachment_name || 'attachment');
    } catch {
      toast.error(t('assignmentsPage.downloadFailed'));
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!reviewTarget) return;
    setReviewSaving(true);
    try {
      const { data } = await assignmentsAPI.reviewSubmission(reviewTarget.id, {
        score: reviewForm.score !== '' ? Number(reviewForm.score) : null,
        feedback: reviewForm.feedback || null,
        status: 'reviewed',
      });
      toast.success(data.message || t('assignmentsPage.reviewed'));
      setReviewTarget(null);
      if (submissionsOpen) openSubmissions(submissionsOpen);
    } catch {
      toast.error(t('assignmentsPage.reviewFailed'));
    } finally {
      setReviewSaving(false);
    }
  };

  const viewToggle = (
    <div className="flex rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setView('cards')}
        className={`px-3 py-2 text-sm ${view === 'cards' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-surface-900 text-surface-600'}`}
        aria-label={t('assignmentsPage.cardView')}
      >
        <FontAwesomeIcon icon={faGrip} />
      </button>
      <button
        type="button"
        onClick={() => setView('table')}
        className={`px-3 py-2 text-sm ${view === 'table' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-surface-900 text-surface-600'}`}
        aria-label={t('assignmentsPage.tableView')}
      >
        <FontAwesomeIcon icon={faTableCells} />
      </button>
    </div>
  );

  const submissionStatusLabel = (status) => {
    const key = `assignmentsPage.status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    return t(key, { defaultValue: statusMeta(status).label });
  };

  const tableColumns = [
    { key: 'title', label: t('assignmentsPage.columnTitle'), render: (_, row) => (
      <span className="font-medium text-surface-900 dark:text-white">{row.title}</span>
    )},
    { key: 'course', label: t('assignmentsPage.columnCourse'), render: (_, row) => row.course?.name ?? '—' },
    { key: 'due_date', label: t('assignmentsPage.columnDeadline'), render: (_, row) => formatDueDate(row.due_date) },
    { key: 'submissions', label: t('assignmentsPage.columnSubmissions'), render: (_, row) => row.submissions_count ?? 0 },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex justify-end gap-1 flex-wrap">
          {row.attachment_path && (
            <Button size="sm" variant="ghost" onClick={() => handleDownloadAttachment(row)} title={t('assignmentsPage.downloadAttachment')}>
              <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" />
            </Button>
          )}
          {canEdit && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openSubmissions(row)} title={t('assignmentsPage.submissions')}>
                <FontAwesomeIcon icon={faUsers} className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(row); setModalOpen(true); }}>
                <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-danger-500" onClick={() => setDeleteTarget(row)}>
                <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('assignmentsPage.title')}
        subtitle={isAdmin ? t('assignmentsPage.subtitleAdmin') : t('assignmentsPage.subtitleTeacher')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {viewToggle}
            {canEdit && (
              <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 me-2" />
                {t('assignmentsPage.newAssignment')}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t('assignmentsPage.searchPlaceholder')} className="flex-1" />
        <Select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="sm:w-56"
        >
          <option value="">{t('common.allCourses')}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={faClipboardList}
          title={t('assignmentsPage.noAssignments')}
          message={canEdit ? t('assignmentsPage.emptyCreate') : t('assignmentsPage.emptyDisplay')}
          action={canEdit ? (
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4 me-2" />
              {t('assignmentsPage.createAssignment')}
            </Button>
          ) : null}
        />
      ) : view === 'table' ? (
        <Card padding={false}>
          <Table columns={tableColumns} data={filtered} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 h-full">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-surface-900 dark:text-white">{a.title}</h3>
                  <p className="text-xs text-surface-500 mt-1">{a.course?.name}</p>
                </div>
                <Badge color={a.status === 'draft' ? 'gray' : 'success'} size="xs">
                  {a.status === 'draft' ? t('assignmentsPage.draft') : t('assignmentsPage.published')}
                </Badge>
              </div>
              <p className="text-sm text-surface-500">{t('assignmentsPage.due', { date: formatDueDate(a.due_date) })}</p>
              {a.description && (
                <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">{a.description}</p>
              )}
              <p className="text-xs text-surface-400">
                {t('assignmentsPage.submissionCount', { count: a.submissions_count ?? 0 })}
                {isAdmin && a.teacher?.user?.name ? ` · ${a.teacher.user.name}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-surface-100 dark:border-surface-800">
                {a.attachment_path && (
                  <Button size="sm" variant="outline" onClick={() => handleDownloadAttachment(a)}>
                    <FontAwesomeIcon icon={faDownload} className="w-3 h-3 me-1" />
                    {t('assignmentsPage.file')}
                  </Button>
                )}
                {canEdit && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openSubmissions(a)}>
                      <FontAwesomeIcon icon={faUsers} className="w-3 h-3 me-1" />
                      {t('assignmentsPage.submissions')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(a); setModalOpen(true); }}>
                      {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="outline" className="text-danger-500" onClick={() => setDeleteTarget(a)}>
                      {t('common.delete')}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canEdit && (
        <AssignmentFormModal
          isOpen={modalOpen}
          editing={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSuccess={load}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t('assignmentsPage.deleteTitle')}
        message={t('assignmentsPage.deleteMessage')}
        confirmLabel={t('common.delete')}
        variant="danger"
      />

      <Modal
        isOpen={!!submissionsOpen}
        onClose={() => { setSubmissionsOpen(null); setSubmissions([]); }}
        title={submissionsOpen ? t('assignmentsPage.submissionsTitle', { title: submissionsOpen.title }) : t('assignmentsPage.submissions')}
        size="xl"
      >
        {submissionsLoading ? (
          <p className="text-surface-500 text-sm py-8 text-center">{t('assignmentsPage.loading')}</p>
        ) : submissions.length === 0 ? (
          <p className="text-surface-500 text-sm py-8 text-center">{t('assignmentsPage.noSubmissions')}</p>
        ) : (
          <div className="responsive-table-wrap">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-surface-500 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="text-start py-2 px-2">{t('assignmentsPage.columnStudent')}</th>
                  <th className="text-start py-2 px-2">{t('assignmentsPage.columnSubmitted')}</th>
                  <th className="text-start py-2 px-2">{t('assignmentsPage.columnStatus')}</th>
                  <th className="text-end py-2 px-2">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {submissions.map((s) => {
                  const st = statusMeta(s.status);
                  return (
                    <tr key={s.id}>
                      <td className="py-3 px-2">{s.student?.user?.name ?? '—'}</td>
                      <td className="py-3 px-2">{formatDueDate(s.submitted_at)}</td>
                      <td className="py-3 px-2">
                        <Badge color={st.color} dot size="xs">{submissionStatusLabel(s.status)}</Badge>
                      </td>
                      <td className="py-3 px-2 text-end">
                        <div className="flex justify-end gap-2">
                          {s.file_path && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => assignmentsAPI.downloadSubmissionFile(s.id, s.file_name)}
                            >
                              <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewTarget(s);
                              setReviewForm({
                                score: s.score != null ? String(s.score) : '',
                                feedback: s.feedback ?? '',
                              });
                            }}
                          >
                            {t('assignmentsPage.review')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={t('assignmentsPage.reviewSubmission')}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setReviewTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" form="review-form" loading={reviewSaving}>{t('assignmentsPage.markReviewed')}</Button>
          </div>
        }
      >
        <form id="review-form" onSubmit={handleReview} className="space-y-4">
          <p className="text-sm text-surface-500">
            {t('assignmentsPage.student')}: <span className="font-medium text-surface-800 dark:text-surface-200">{reviewTarget?.student?.user?.name}</span>
          </p>
          <FormField label={t('common.score')}>
            <Input
              type="number"
              min="0"
              value={reviewForm.score}
              onChange={(e) => setReviewForm((p) => ({ ...p, score: e.target.value }))}
            />
          </FormField>
          <FormField label={t('assignmentsPage.feedback')}>
            <Textarea
              rows={3}
              value={reviewForm.feedback}
              onChange={(e) => setReviewForm((p) => ({ ...p, feedback: e.target.value }))}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
