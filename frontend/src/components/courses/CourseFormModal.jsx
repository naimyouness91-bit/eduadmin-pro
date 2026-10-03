import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { coursesAPI, teachersAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Input, Select, Textarea, Button } from '../common/UI';

const SEMESTERS = ['Fall 2025', 'Spring 2025', 'Summer 2025'];

const emptyForm = {
  name: '',
  code: '',
  teacher_id: '',
  grade_level: '',
  credits: '',
  max_students: '',
  room: '',
  status: 'active',
  semester: '',
  academic_year: '2024-2025',
  description: '',
};

function courseToForm(course) {
  if (!course) return { ...emptyForm };
  return {
    name: course.name ?? '',
    code: course.code ?? '',
    teacher_id: course.teacher_id ?? '',
    grade_level: course.grade_level ?? '',
    credits: course.credits ?? '',
    max_students: course.max_students ?? '',
    room: course.room ?? '',
    status: course.status ?? 'active',
    semester: course.semester ?? '',
    academic_year: course.academic_year ?? '',
    description: course.description ?? '',
  };
}

export default function CourseFormModal({ isOpen, onClose, course, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = !!course;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);

  const gradeLevels = useMemo(
    () => [t('common.grade9'), t('common.grade10'), t('common.grade11'), t('common.grade12')],
    [t]
  );

  const statuses = useMemo(
    () => [
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
      { value: 'archived', label: t('common.archived') },
    ],
    [t]
  );

  useEffect(() => {
    if (isOpen) {
      setForm(courseToForm(course));
      setErrors({});
      teachersAPI.list({ per_page: 100 }).then((res) => setTeachers(res.data.data ?? [])).catch(() => {});
    }
  }, [isOpen, course]);

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
      teacher_id: form.teacher_id || null,
      credits: form.credits === '' ? null : Number(form.credits),
      max_students: form.max_students === '' ? null : Number(form.max_students),
    };
    try {
      if (isEdit) {
        const { data } = await coursesAPI.update(course.id, payload);
        toast.success(data.message || t('courses.formUpdated'));
      } else {
        const { data } = await coursesAPI.create(payload);
        toast.success(data.message || t('courses.formCreated'));
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
      title={isEdit ? t('courses.formEditTitle') : t('courses.formAddTitle')}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button type="submit" form="course-form" loading={loading}>
            {isEdit ? t('courses.formSaveChanges') : t('courses.formCreateCourse')}
          </Button>
        </div>
      }
    >
      <form id="course-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('courses.formName')} error={errors.name} required>
          <Input value={form.name} onChange={(e) => setField('name', e.target.value)} error={errors.name} required />
        </FormField>
        <FormField label={t('courses.formCode')} error={errors.code} required>
          <Input value={form.code} onChange={(e) => setField('code', e.target.value)} error={errors.code} className="font-mono" required />
        </FormField>
        <FormField label={t('courses.formTeacher')} error={errors.teacher_id}>
          <Select value={form.teacher_id} onChange={(e) => setField('teacher_id', e.target.value)} error={errors.teacher_id}>
            <option value="">{t('courses.unassigned')}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.user?.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('courses.formGradeLevel')} error={errors.grade_level}>
          <Select value={form.grade_level} onChange={(e) => setField('grade_level', e.target.value)} error={errors.grade_level}>
            <option value="">{t('courses.formSelectGrade')}</option>
            {gradeLevels.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </FormField>
        <FormField label={t('common.credits')} error={errors.credits}>
          <Input type="number" min="1" value={form.credits} onChange={(e) => setField('credits', e.target.value)} error={errors.credits} />
        </FormField>
        <FormField label={t('courses.formMaxStudents')} error={errors.max_students}>
          <Input type="number" min="1" value={form.max_students} onChange={(e) => setField('max_students', e.target.value)} error={errors.max_students} />
        </FormField>
        <FormField label={t('courses.formRoom')} error={errors.room}>
          <Input value={form.room} onChange={(e) => setField('room', e.target.value)} error={errors.room} />
        </FormField>
        <FormField label={t('common.status')} error={errors.status}>
          <Select value={form.status} onChange={(e) => setField('status', e.target.value)} error={errors.status}>
            {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </FormField>
        <FormField label={t('courses.semester')} error={errors.semester}>
          <Select value={form.semester} onChange={(e) => setField('semester', e.target.value)} error={errors.semester}>
            <option value="">{t('courses.formSelectSemester')}</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label={t('courses.academicYear')} error={errors.academic_year}>
          <Input value={form.academic_year} onChange={(e) => setField('academic_year', e.target.value)} error={errors.academic_year} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t('courses.description')} error={errors.description}>
            <Textarea rows={3} value={form.description} onChange={(e) => setField('description', e.target.value)} error={errors.description} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
