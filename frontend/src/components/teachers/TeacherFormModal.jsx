import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { teachersAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Input, Select, Textarea, Button } from '../common/UI';

export const SPECIALIZATIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English Literature',
  'History',
  'Geography',
  'Art & Design',
  'Music',
  'Physical Education',
  'French',
  'Spanish',
  'Economics',
  'Philosophy',
];

export const DEPARTMENTS = [
  'Science & Mathematics',
  'Technology',
  'Humanities',
  'Languages',
  'Arts & Culture',
  'Physical Education',
  'Administration',
];

const EMPLOYMENT_TYPE_VALUES = ['full_time', 'part_time', 'contract'];

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  specialization: '',
  department: '',
  qualification: '',
  experience_years: '',
  employment_type: 'full_time',
  joining_date: '',
  salary: '',
  bio: '',
};

function teacherToForm(teacher) {
  if (!teacher) return { ...emptyForm };
  return {
    name: teacher.user?.name ?? '',
    email: teacher.user?.email ?? '',
    password: '',
    phone: teacher.user?.phone ?? '',
    specialization: teacher.specialization ?? '',
    department: teacher.department ?? '',
    qualification: teacher.qualification ?? '',
    experience_years: teacher.experience_years ?? '',
    employment_type: teacher.employment_type ?? 'full_time',
    joining_date: teacher.joining_date ?? '',
    salary: teacher.salary ?? '',
    bio: teacher.bio ?? '',
  };
}

export default function TeacherFormModal({ isOpen, onClose, teacher, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = !!teacher;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const employmentTypes = useMemo(
    () =>
      EMPLOYMENT_TYPE_VALUES.map((value) => ({
        value,
        label: t(`teachers.employment${value.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`),
      })),
    [t]
  );

  useEffect(() => {
    if (isOpen) {
      setForm(teacherToForm(teacher));
      setErrors({});
    }
  }, [isOpen, teacher]);

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
      experience_years: form.experience_years === '' ? null : Number(form.experience_years),
      salary: form.salary === '' ? null : Number(form.salary),
    };
    if (isEdit && !payload.password) delete payload.password;

    try {
      if (isEdit) {
        const { data } = await teachersAPI.update(teacher.id, payload);
        toast.success(data.message || t('teachers.formUpdated'));
      } else {
        const { data } = await teachersAPI.create(payload);
        toast.success(data.message || t('teachers.formCreated'));
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

  const footer = (
    <div className="flex gap-3 justify-end">
      <Button variant="outline" onClick={onClose} disabled={loading}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="teacher-form" loading={loading}>
        {isEdit ? t('teachers.formSaveChanges') : t('teachers.formCreateTeacher')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('teachers.formEditTitle') : t('teachers.formAddTitle')}
      size="lg"
      footer={footer}
    >
      <form id="teacher-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('teachers.formFullName')} error={errors.name} required>
          <Input value={form.name} onChange={(e) => setField('name', e.target.value)} error={errors.name} required />
        </FormField>
        <FormField label={t('teachers.email')} error={errors.email} required>
          <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} error={errors.email} required />
        </FormField>
        {!isEdit ? (
          <FormField label={t('teachers.formPassword')} error={errors.password} required>
            <Input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} error={errors.password} required />
          </FormField>
        ) : (
          <FormField label={t('teachers.formNewPassword')} error={errors.password} hint={t('teachers.formNewPasswordHint')}>
            <Input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} error={errors.password} />
          </FormField>
        )}
        <FormField label={t('teachers.phone')} error={errors.phone}>
          <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} error={errors.phone} />
        </FormField>
        <FormField label={t('teachers.columnSpecialization')} error={errors.specialization} required>
          <Select value={form.specialization} onChange={(e) => setField('specialization', e.target.value)} error={errors.specialization} required>
            <option value="">{t('teachers.formSelectSpecialization')}</option>
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('common.department')} error={errors.department}>
          <Select value={form.department} onChange={(e) => setField('department', e.target.value)} error={errors.department}>
            <option value="">{t('teachers.formSelectDepartment')}</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('teachers.qualification')} error={errors.qualification}>
          <Input value={form.qualification} onChange={(e) => setField('qualification', e.target.value)} error={errors.qualification} />
        </FormField>
        <FormField label={t('teachers.formExperienceYears')} error={errors.experience_years}>
          <Input type="number" min="0" value={form.experience_years} onChange={(e) => setField('experience_years', e.target.value)} error={errors.experience_years} />
        </FormField>
        <FormField label={t('teachers.formEmploymentType')} error={errors.employment_type}>
          <Select value={form.employment_type} onChange={(e) => setField('employment_type', e.target.value)} error={errors.employment_type}>
            {employmentTypes.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('teachers.formJoiningDate')} error={errors.joining_date}>
          <Input type="date" value={form.joining_date} onChange={(e) => setField('joining_date', e.target.value)} error={errors.joining_date} />
        </FormField>
        <FormField label={t('teachers.salary')} error={errors.salary}>
          <Input type="number" min="0" step="0.01" value={form.salary} onChange={(e) => setField('salary', e.target.value)} error={errors.salary} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t('teachers.bio')} error={errors.bio}>
            <Textarea rows={4} value={form.bio} onChange={(e) => setField('bio', e.target.value)} error={errors.bio} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
