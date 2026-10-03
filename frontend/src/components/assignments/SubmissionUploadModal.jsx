import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { assignmentsAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Textarea, Input, Button } from '../common/UI';
import { formatDueDate } from './assignmentUtils';

export default function SubmissionUploadModal({ isOpen, onClose, assignment, onSuccess }) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  const reset = () => {
    setContent('');
    setFile(null);
    setErrors({});
    setUploadProgress(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !file) {
      toast.error(t('assignmentsPage.submitNeedContent'));
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    const fd = new FormData();
    if (content.trim()) fd.append('content', content.trim());
    if (file) fd.append('file', file);

    try {
      const { data } = await assignmentsAPI.submit(assignment.id, fd, {
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      toast.success(data.message || t('assignmentsPage.submitSent'));
      onSuccess?.();
      handleClose();
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setErrors(fieldErrors);
      if (general) toast.error(general);
    } finally {
      setLoading(false);
    }
  };

  if (!assignment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('assignmentsPage.submitTitle', { title: assignment.title })}
      size="md"
      footer={
        <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-end">
          {loading && uploadProgress > 0 && (
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-surface-500 mb-1">
                <span>{t('assignmentsPage.submitUploading')}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end shrink-0">
            <Button variant="outline" onClick={handleClose} disabled={loading}>{t('common.cancel')}</Button>
            <Button type="submit" form="submission-form" loading={loading}>{t('assignmentsPage.submitButton')}</Button>
          </div>
        </div>
      }
    >
      <form id="submission-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-surface-500">
          {t('assignmentsPage.submitDeadline')}{' '}
          <span className="font-medium text-surface-700 dark:text-surface-300">{formatDueDate(assignment.due_date)}</span>
        </p>
        {assignment.description && (
          <div className="text-sm text-surface-600 dark:text-surface-400 bg-surface-50 dark:bg-surface-800/50 rounded-xl p-3 max-h-32 overflow-y-auto">
            {assignment.description}
          </div>
        )}
        <FormField label={t('assignmentsPage.submitNotes')} error={errors.content}>
          <Textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('assignmentsPage.submitNotesPlaceholder')}
          />
        </FormField>
        <FormField label={t('assignmentsPage.submitFile')} error={errors.file} required={!content.trim()}>
          <Input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.zip,.rar,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
