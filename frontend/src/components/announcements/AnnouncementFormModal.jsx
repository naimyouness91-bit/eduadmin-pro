import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { announcementsAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Input, Select, Textarea, Button } from '../common/UI';

const TARGET_ROLE_VALUES = ['', 'student', 'teacher', 'parent', 'admin'];

const TARGET_ROLE_KEYS = {
  '': 'announcementsPage.everyone',
  student: 'announcementsPage.targetStudents',
  teacher: 'announcementsPage.targetTeachers',
  parent: 'announcementsPage.targetParents',
  admin: 'announcementsPage.targetAdmins',
};

const emptyForm = {
  title: '',
  content: '',
  target_role: '',
  is_published: false,
};

function announcementToForm(announcement) {
  if (!announcement) return { ...emptyForm };
  return {
    title: announcement.title ?? '',
    content: announcement.content ?? '',
    target_role: announcement.target_role ?? '',
    is_published: !!announcement.is_published,
  };
}

export default function AnnouncementFormModal({ isOpen, onClose, announcement, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = !!announcement;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const targetRoles = useMemo(
    () =>
      TARGET_ROLE_VALUES.map((value) => ({
        value,
        label: t(TARGET_ROLE_KEYS[value]),
      })),
    [t]
  );

  useEffect(() => {
    if (isOpen) {
      setForm(announcementToForm(announcement));
      setErrors({});
    }
  }, [isOpen, announcement]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const payload = {
      ...form,
      target_role: form.target_role || null,
    };
    try {
      if (isEdit) {
        const { data } = await announcementsAPI.update(announcement.id, payload);
        toast.success(data.message || t('announcementsPage.formUpdated'));
      } else {
        const { data } = await announcementsAPI.create(payload);
        toast.success(data.message || t('announcementsPage.formCreated'));
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setErrors(fieldErrors);
      if (general) toast.error(general);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('announcementsPage.formEdit') : t('announcementsPage.formNew')}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button type="submit" form="announcement-form" loading={loading}>
            {isEdit ? t('common.save') : t('announcementsPage.createAnnouncement')}
          </Button>
        </div>
      }
    >
      <form id="announcement-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t('common.title')} error={errors.title} required>
          <Input value={form.title} onChange={(e) => setField('title', e.target.value)} error={errors.title} required />
        </FormField>
        <FormField label={t('announcementsPage.formContent')} error={errors.content} required>
          <Textarea rows={5} value={form.content} onChange={(e) => setField('content', e.target.value)} error={errors.content} required />
        </FormField>
        <FormField label={t('announcementsPage.formTargetAudience')} error={errors.target_role}>
          <Select value={form.target_role} onChange={(e) => setField('target_role', e.target.value)} error={errors.target_role}>
            {targetRoles.map((r) => (
              <option key={r.value || 'all'} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </FormField>
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
          <div>
            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{t('announcementsPage.formPublished')}</p>
            <p className="text-xs text-surface-500 mt-0.5">
              {form.is_published
                ? t('announcementsPage.formPublishedHint')
                : t('announcementsPage.formDraftHint')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_published}
            onClick={() => setField('is_published', !form.is_published)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              form.is_published ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                form.is_published ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </form>
    </Modal>
  );
}
