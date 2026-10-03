import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { schedulesAPI, coursesAPI, teachersAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Input, Select, Button } from '../common/UI';

const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7];
const DAY_KEYS = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

const emptyForm = {
  course_id: '',
  teacher_id: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
  room: '',
};

function toInputTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

export default function ScheduleFormModal({ isOpen, onClose, onSuccess, slot = null }) {
  const { t } = useTranslation();
  const isEdit = Boolean(slot?.id);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});

    if (slot) {
      setForm({
        course_id: String(slot.course_id ?? ''),
        teacher_id: slot.teacher_id ? String(slot.teacher_id) : '',
        day_of_week: String(slot.day_of_week ?? ''),
        start_time: toInputTime(slot.start_time),
        end_time: toInputTime(slot.end_time),
        room: slot.room ?? '',
      });
    } else {
      setForm(emptyForm);
    }

    Promise.all([
      coursesAPI.list({ per_page: 100 }),
      teachersAPI.list({ per_page: 100 }),
    ]).then(([courseRes, teacherRes]) => {
      setCourses(courseRes.data.data ?? []);
      setTeachers(teacherRes.data.data ?? []);
    }).catch(() => {});
  }, [isOpen, slot]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setErrors({ end_time: t('scheduleUi.endAfterStart') });
      return;
    }

    const course = courses.find((c) => String(c.id) === String(form.course_id));
    const payload = {
      course_id: Number(form.course_id),
      teacher_id: form.teacher_id ? Number(form.teacher_id) : (course?.teacher_id ?? null),
      day_of_week: Number(form.day_of_week),
      start_time: toInputTime(form.start_time),
      end_time: toInputTime(form.end_time),
      room: form.room || course?.room || null,
      semester: course?.semester,
      academic_year: course?.academic_year,
      is_active: true,
    };

    setLoading(true);
    try {
      const { data } = isEdit
        ? await schedulesAPI.update(slot.id, payload)
        : await schedulesAPI.create(payload);
      toast.success(data.message || (isEdit ? t('scheduleUi.sessionUpdated') : t('scheduleUi.classAdded')));
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
      title={isEdit ? t('scheduleUi.editSession') : t('scheduleUi.addSession')}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button type="submit" form="schedule-form" loading={loading}>
            {isEdit ? t('scheduleUi.saveChanges') : t('scheduleUi.addClass')}
          </Button>
        </div>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t('common.course')} error={errors.course_id} required>
          <Select value={form.course_id} onChange={(e) => setField('course_id', e.target.value)} error={errors.course_id} required>
            <option value="">{t('scheduleUi.selectCourse')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('scheduleUi.instructor')} error={errors.teacher_id}>
          <Select value={form.teacher_id} onChange={(e) => setField('teacher_id', e.target.value)} error={errors.teacher_id}>
            <option value="">{t('scheduleUi.assignFromCourse')}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.user?.name ?? t('scheduleUi.teacherFallback', { id: teacher.id })}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('scheduleUi.day')} error={errors.day_of_week} required>
          <Select value={form.day_of_week} onChange={(e) => setField('day_of_week', e.target.value)} error={errors.day_of_week} required>
            <option value="">{t('scheduleUi.selectDay')}</option>
            {DAY_VALUES.map((value) => (
              <option key={value} value={value}>{t(`scheduleUi.days.${DAY_KEYS[value]}`)}</option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('scheduleUi.startTime')} error={errors.start_time} required>
            <Input type="time" value={form.start_time} onChange={(e) => setField('start_time', e.target.value)} error={errors.start_time} required />
          </FormField>
          <FormField label={t('scheduleUi.endTime')} error={errors.end_time} required>
            <Input type="time" value={form.end_time} onChange={(e) => setField('end_time', e.target.value)} error={errors.end_time} required />
          </FormField>
        </div>
        <FormField label={t('scheduleUi.classroom')} error={errors.room}>
          <Input value={form.room} onChange={(e) => setField('room', e.target.value)} error={errors.room} placeholder={t('scheduleUi.roomPlaceholder')} />
        </FormField>
      </form>
    </Modal>
  );
}
