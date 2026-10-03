import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { assignmentsAPI, coursesAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Input, Select, Textarea, Button } from '../common/UI';

const emptyForm = {
  course_id: '',
  title: '',
  description: '',
  due_date: '',
  max_score: '100',
  type: 'homework',
  status: 'published',
};

export default function AssignmentFormModal({ isOpen, onClose, onSuccess, editing = null }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [courses, setCourses] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setAttachment(null);
    setRemoveAttachment(false);
    setUploadProgress(0);
    coursesAPI.list({ per_page: 100 }).then((res) => setCourses(res.data.data ?? [])).catch(() => {});

    if (editing) {
      const due = editing.due_date
        ? new Date(editing.due_date).toISOString().slice(0, 16)
        : '';
      setForm({
        course_id: String(editing.course_id ?? ''),
        title: editing.title ?? '',
        description: editing.description ?? '',
        due_date: due,
        max_score: editing.max_score != null ? String(editing.max_score) : '100',
        type: editing.type ?? 'homework',
        status: editing.status ?? 'published',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, editing]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('course_id', form.course_id);
    fd.append('title', form.title);
    if (form.description) fd.append('description', form.description);
    if (form.due_date) fd.append('due_date', new Date(form.due_date).toISOString());
    if (form.max_score) fd.append('max_score', form.max_score);
    fd.append('type', form.type);
    fd.append('status', form.status);
    if (attachment) fd.append('attachment', attachment);
    if (editing && removeAttachment) fd.append('remove_attachment', '1');
    if (editing) fd.append('_method', 'PUT');
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    setUploadProgress(0);
    const config = {
      onUploadProgress: (ev) => {
        if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
      },
    };
    try {
      const fd = buildFormData();
      const { data } = editing
        ? await assignmentsAPI.update(editing.id, fd, config)
        : await assignmentsAPI.create(fd, config);
      toast.success(data.message || t('assignmentsPage.formSaved'));
      onSuccess?.();
      onClose();
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setErrors(fieldErrors);
      if (general) toast.error(general);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? t('assignmentsPage.editAssignment') : t('assignmentsPage.createAssignment')}
      size="lg"
      footer={
        <div className="flex flex-col gap-3 w-full sm:flex-row sm:justify-end">
          {loading && uploadProgress > 0 && (
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-surface-500 mb-1">
                <span>{t('assignmentsPage.formUploading')}</span>
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
            <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
            <Button type="submit" form="assignment-form" loading={loading}>
              {editing ? t('common.save') : t('assignmentsPage.createAssignment')}
            </Button>
          </div>
        </div>
      }
    >
      <form id="assignment-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t('assignmentsPage.formCourse')} error={errors.course_id} required>
          <Select
            value={form.course_id}
            onChange={(e) => setField('course_id', e.target.value)}
            disabled={!!editing}
          >
            <option value="">{t('assignmentsPage.selectCourse')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('assignmentsPage.formTitle')} error={errors.title} required>
          <Input value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </FormField>
        <FormField label={t('assignmentsPage.formInstructions')} error={errors.description}>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder={t('assignmentsPage.formInstructionsPlaceholder')}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('assignmentsPage.formDeadline')} error={errors.due_date}>
            <Input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setField('due_date', e.target.value)}
            />
          </FormField>
          <FormField label={t('assignmentsPage.formMaxScore')} error={errors.max_score}>
            <Input
              type="number"
              min="0"
              value={form.max_score}
              onChange={(e) => setField('max_score', e.target.value)}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('assignmentsPage.formType')} error={errors.type}>
            <Select value={form.type} onChange={(e) => setField('type', e.target.value)}>
              <option value="homework">{t('assignmentsPage.typeHomework')}</option>
              <option value="quiz">{t('assignmentsPage.typeQuiz')}</option>
              <option value="project">{t('assignmentsPage.typeProject')}</option>
              <option value="exam">{t('assignmentsPage.typeExam')}</option>
            </Select>
          </FormField>
          <FormField label={t('assignmentsPage.formStatus')} error={errors.status}>
            <Select value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="published">{t('assignmentsPage.published')}</option>
              <option value="draft">{t('assignmentsPage.draft')}</option>
            </Select>
          </FormField>
        </div>
        <FormField label={t('assignmentsPage.formAttachment')} error={errors.attachment}>
          {editing?.attachment_name && !removeAttachment && (
            <p className="text-sm text-surface-500 mb-2">
              {t('assignmentsPage.formAttachmentCurrent', { name: editing.attachment_name })}
              <button
                type="button"
                className="ms-2 text-danger-500 hover:underline text-xs"
                onClick={() => setRemoveAttachment(true)}
              >
                {t('assignmentsPage.formRemove')}
              </button>
            </p>
          )}
          <Input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.zip,.rar,.png,.jpg,.jpeg"
            onChange={(e) => {
              setAttachment(e.target.files?.[0] ?? null);
              setRemoveAttachment(false);
            }}
          />
        </FormField>
      </form>
    </Modal>
  );
}
