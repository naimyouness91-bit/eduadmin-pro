import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { studentsAPI } from '../../services/api';
import { Button, FormField, Input, Select, Textarea } from '../common/UI';

export default function ParentForm({
  initialValues = {},
  onSubmit,
  submitLabel,
  loading = false,
  isEdit = false,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    occupation: '',
    relationship: 'guardian',
    national_id: '',
    notes: '',
    is_active: true,
    student_ids: [],
    ...initialValues,
  });
  const [students, setStudents] = useState([]);
  const [errors, setErrors] = useState({});

  const RELATIONSHIP_OPTIONS = useMemo(
    () => [
      { value: 'father', label: t('students.formFather') },
      { value: 'mother', label: t('students.formMother') },
      { value: 'guardian', label: t('students.formGuardian') },
    ],
    [t],
  );

  useEffect(() => {
    studentsAPI.list({ per_page: 200, enrollment_status: 'active' }).then(({ data }) => {
      setStudents(data.data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length) {
      setForm((prev) => ({
        ...prev,
        ...initialValues,
        student_ids: initialValues.student_ids ?? prev.student_ids,
      }));
    }
  }, [initialValues]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleStudent = (id) => {
    setForm((prev) => {
      const ids = prev.student_ids.includes(id)
        ? prev.student_ids.filter((x) => x !== id)
        : [...prev.student_ids, id];
      return { ...prev, student_ids: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const payload = { ...form };
    if (isEdit && !payload.password) delete payload.password;
    try {
      await onSubmit(payload);
    } catch (err) {
      const fieldErrors = err.response?.data?.errors ?? {};
      const mapped = Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      );
      setErrors(mapped);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label={t('students.formFullName')} error={errors.name} required>
          <Input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
        </FormField>
        <FormField label={t('students.formEmail')} error={errors.email} required>
          <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
        </FormField>
        <FormField
          label={isEdit ? t('parentsPage.formNewPasswordOptional') : t('students.formPassword')}
          error={errors.password}
          required={!isEdit}
        >
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            required={!isEdit}
            minLength={8}
          />
        </FormField>
        <FormField label={t('students.formPhone')} error={errors.phone}>
          <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
        </FormField>
        <FormField label={t('parentsPage.occupation')} error={errors.occupation}>
          <Input value={form.occupation} onChange={(e) => setField('occupation', e.target.value)} />
        </FormField>
        <FormField label={t('students.formRelationship')} error={errors.relationship}>
          <Select value={form.relationship} onChange={(e) => setField('relationship', e.target.value)}>
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('parentsPage.nationalId')} error={errors.national_id}>
          <Input value={form.national_id} onChange={(e) => setField('national_id', e.target.value)} />
        </FormField>
        <FormField label={t('parentsPage.formAccountStatus')} error={errors.is_active}>
          <Select
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(e) => setField('is_active', e.target.value === 'active')}
          >
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </Select>
        </FormField>
      </div>

      <FormField label={t('parentsPage.formNotes')} error={errors.notes}>
        <Textarea rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
      </FormField>

      <div>
        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-100 mb-2">
          {t('parentsPage.formLinkStudents')}
        </h3>
        <p className="text-xs text-surface-500 mb-3">
          {t('parentsPage.formLinkStudentsHint')}
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-surface-500">{t('parentsPage.formNoStudentsAvailable')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-xl p-3">
            {students.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                  form.student_ids.includes(s.id)
                    ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-300'
                    : 'hover:bg-surface-50 dark:hover:bg-surface-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.student_ids.includes(s.id)}
                  onChange={() => toggleStudent(s.id)}
                />
                <span>
                  {s.user?.name ?? s.name} <span className="text-surface-500">({s.student_id})</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {errors.student_ids && <p className="text-xs text-danger-500 mt-1">{errors.student_ids}</p>}
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="submit" loading={loading}>{submitLabel ?? t('parentsPage.formSaveParent')}</Button>
      </div>
    </form>
  );
}
