import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, FormField, Select, Button, Input } from '../common/UI';
import { SCHOOL_WEEK_DAYS } from '../../utils/timetableConstants';

const emptyForm = {
  course_id: '',
  teacher_id: '',
  room: '',
  day_of_week: '1',
  start_time: '08:00',
  end_time: '09:00',
};

export default function TimetableSessionModal({
  isOpen,
  onClose,
  session = null,
  defaultDay = 1,
  courses = [],
  teachers = [],
  onSave,
  loading = false,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(session?.id);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (session) {
      setForm({
        course_id: String(session.course?.id ?? ''),
        teacher_id: session.teacher?.id ? String(session.teacher.id) : '',
        room: session.room ?? '',
        day_of_week: String(session.day_of_week ?? 1),
        start_time: String(session.start_time ?? '').slice(0, 5),
        end_time: String(session.end_time ?? '').slice(0, 5),
      });
    } else {
      setForm({
        ...emptyForm,
        day_of_week: String(defaultDay ?? 1),
      });
    }
  }, [isOpen, session, defaultDay]);

  const selectedCourse = courses.find((c) => String(c.id) === form.course_id);

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'course_id') {
        const course = courses.find((c) => String(c.id) === value);
        if (course && !prev.teacher_id) {
          next.teacher_id = course.teacher_id ? String(course.teacher_id) : '';
        }
        if (course?.room && !prev.room) {
          next.room = course.room;
        }
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = () => {
    const fieldErrors = {};
    if (!form.course_id) fieldErrors.course_id = t('timetable.subjectRequired');
    if (!form.day_of_week) fieldErrors.day_of_week = t('timetable.dayRequired');
    if (!form.start_time) fieldErrors.start_time = t('timetable.startRequired');
    if (!form.end_time) fieldErrors.end_time = t('timetable.endRequired');
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      fieldErrors.end_time = t('timetable.endAfterStart');
    }
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    onSave?.({
      id: session?.id,
      course_id: Number(form.course_id),
      teacher_id: form.teacher_id ? Number(form.teacher_id) : selectedCourse?.teacher_id ?? null,
      room: form.room || selectedCourse?.room || null,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('timetable.editSession') : t('timetable.addSession')}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormField label={t('timetable.subject')} error={errors.course_id} required>
            <Select
              value={form.course_id}
              onChange={(e) => setField('course_id', e.target.value)}
              error={errors.course_id}
            >
              <option value="">{t('timetable.selectSubject')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label={t('timetable.teacher')} error={errors.teacher_id}>
          <Select value={form.teacher_id} onChange={(e) => setField('teacher_id', e.target.value)}>
            <option value="">{t('timetable.selectTeacher')}</option>
            {teachers.map((teach) => (
              <option key={teach.id} value={teach.id}>
                {teach.user?.name ?? `Teacher #${teach.id}`}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('timetable.classroom')} error={errors.room}>
          <Input
            value={form.room}
            onChange={(e) => setField('room', e.target.value)}
            placeholder={t('timetable.roomPlaceholder')}
          />
        </FormField>

        <FormField label={t('timetable.dayOfWeek')} error={errors.day_of_week} required>
          <Select
            value={form.day_of_week}
            onChange={(e) => setField('day_of_week', e.target.value)}
            error={errors.day_of_week}
          >
            {SCHOOL_WEEK_DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('timetable.startTime')} error={errors.start_time} required>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => setField('start_time', e.target.value)}
            error={errors.start_time}
          />
        </FormField>

        <FormField label={t('timetable.endTime')} error={errors.end_time} required>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => setField('end_time', e.target.value)}
            error={errors.end_time}
          />
        </FormField>
      </div>
    </Modal>
  );
}
