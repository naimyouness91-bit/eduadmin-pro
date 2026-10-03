import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList,
  faDownload,
  faUpload,
  faTableCells,
  faGrip,
} from '@fortawesome/free-solid-svg-icons';
import { assignmentsAPI } from '../../services/api';
import { GlassCard, StudentEmptyState, StudentPageShell } from '../../components/student/StudentUI';
import { Badge, Button } from '../../components/common/UI';
import SubmissionUploadModal from '../../components/assignments/SubmissionUploadModal';
import { formatDueDate, isPastDue, statusMeta } from '../../components/assignments/assignmentUtils';

const SUBMISSION_LABEL_KEYS = {
  pending: 'studentPages.submissionPending',
  submitted: 'studentPages.submissionSubmitted',
  late: 'studentPages.submissionLate',
  reviewed: 'studentPages.submissionReviewed',
};

export default function StudentAssignments() {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('cards');
  const [submitTarget, setSubmitTarget] = useState(null);

  const submissionLabel = (status) => {
    const st = statusMeta(status);
    return t(SUBMISSION_LABEL_KEYS[status] || SUBMISSION_LABEL_KEYS.pending, { defaultValue: st.label });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await assignmentsAPI.list({ per_page: 100 });
      setAssignments(data.data ?? []);
    } catch {
      toast.error(t('studentPages.loadAssignmentsFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

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

  const handleDownloadAttachment = async (a) => {
    try {
      await assignmentsAPI.downloadAttachment(a.id, a.attachment_name || 'attachment');
    } catch {
      toast.error(t('studentPages.downloadFailed'));
    }
  };

  return (
    <StudentPageShell
      title={t('studentPages.assignmentsTitle')}
      subtitle={t('studentPages.assignmentsSubtitle')}
      search={search}
      onSearchChange={setSearch}
      actions={
        <div className="flex rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setView('cards')}
            className={`px-3 py-2 text-sm ${view === 'cards' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-surface-900 text-surface-600'}`}
            aria-label={t('studentPages.cardView')}
          >
            <FontAwesomeIcon icon={faGrip} />
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={`px-3 py-2 text-sm ${view === 'table' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-surface-900 text-surface-600'}`}
            aria-label={t('studentPages.tableView')}
          >
            <FontAwesomeIcon icon={faTableCells} />
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-200/50 dark:bg-surface-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <StudentEmptyState icon={faClipboardList} title={t('studentPages.noAssignments')} message={t('studentPages.noAssignmentsHint')} />
      ) : view === 'table' ? (
        <div className="responsive-table-wrap scroll-hint-x rounded-2xl border border-surface-200 dark:border-surface-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-50 dark:bg-surface-800/80 text-surface-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t('studentPages.assignmentColumn')}</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">{t('common.course')}</th>
                <th className="px-4 py-3 font-medium">{t('studentPages.deadline')}</th>
                <th className="px-4 py-3 font-medium">{t('common.status')}</th>
                <th className="px-4 py-3 font-medium text-end">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filtered.map((a) => {
                const st = statusMeta(a.submission_status);
                const reviewed = a.submission_status === 'reviewed';
                return (
                  <tr key={a.id} className="bg-white/80 dark:bg-surface-900/60">
                    <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">{a.title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-surface-500">{a.course?.name}</td>
                    <td className={`px-4 py-3 ${isPastDue(a.due_date) && a.submission_status === 'pending' ? 'text-danger-500' : ''}`}>
                      {formatDueDate(a.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={st.color} dot>{submissionLabel(a.submission_status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {a.attachment_path && (
                          <Button size="sm" variant="outline" onClick={() => handleDownloadAttachment(a)}>
                            <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                          </Button>
                        )}
                        {!reviewed && (
                          <Button size="sm" onClick={() => setSubmitTarget(a)}>
                            <FontAwesomeIcon icon={faUpload} className="w-3 h-3 me-1" />
                            {a.my_submission ? t('studentPages.resubmit') : t('studentPages.submit')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const st = statusMeta(a.submission_status);
            const reviewed = a.submission_status === 'reviewed';
            return (
              <GlassCard key={a.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-surface-900 dark:text-white">{a.title}</h3>
                  <Badge color={st.color} dot size="xs">{submissionLabel(a.submission_status)}</Badge>
                </div>
                <p className="text-xs text-surface-500">{a.course?.name}</p>
                <p className={`text-sm ${isPastDue(a.due_date) && a.submission_status === 'pending' ? 'text-danger-500 font-medium' : 'text-surface-600 dark:text-surface-400'}`}>
                  {t('studentPages.duePrefix', { date: formatDueDate(a.due_date) })}
                </p>
                {a.description && (
                  <p className="text-sm text-surface-500 line-clamp-3">{a.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {a.attachment_path && (
                    <Button size="sm" variant="outline" onClick={() => handleDownloadAttachment(a)}>
                      <FontAwesomeIcon icon={faDownload} className="w-3 h-3 me-1" />
                      {t('studentPages.materials')}
                    </Button>
                  )}
                  {!reviewed && (
                    <Button size="sm" onClick={() => setSubmitTarget(a)}>
                      <FontAwesomeIcon icon={faUpload} className="w-3 h-3 me-1" />
                      {a.my_submission ? t('studentPages.resubmit') : t('studentPages.submit')}
                    </Button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <SubmissionUploadModal
        isOpen={!!submitTarget}
        assignment={submitTarget}
        onClose={() => setSubmitTarget(null)}
        onSuccess={load}
      />
    </StudentPageShell>
  );
}
