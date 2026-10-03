import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, FormField, Select, Button, Input, Textarea } from '../common/UI';

export default function TimetableCellEditor({
  isOpen,
  onClose,
  slot,
  courses = [],
  teachers = [],
  onSave,
  onClear,
  loading = false,
  isNew = false,
}) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCourseId(slot?.cell?.course?.id ? String(slot.cell.course.id) : '');
    setTeacherId(
      slot?.cell?.teacher?.id
        ? String(slot.cell.teacher.id)
        : slot?.cell?.course?.teacher_id
          ? String(slot.cell.course.teacher_id)
          : ''
    );
    setRoom(slot?.cell?.room ?? '');
    setNotes(slot?.cell?.notes ?? '');
  }, [isOpen, slot]);

  if (!slot) return null;

  const selectedCourse = courses.find((c) => String(c.id) === courseId);

  const handleSave = () => {
    if (!courseId) return;
    onSave?.({
      day_of_week: slot.day,
      start_time: slot.period.start,
      end_time: slot.period.end,
      course_id: Number(courseId),
      teacher_id: teacherId ? Number(teacherId) : selectedCourse?.teacher_id ?? null,
      room: room || selectedCourse?.room || null,
      notes: notes.trim() || null,
      id: slot.cell?.id,
    });
  };

  const dayDisplay = slot.dayLabel ?? slot.day;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? t('timetable.addSession') : t('timetable.editSlot')}
      size="md"
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          {slot.cell?.id && (
            <Button variant="outline" onClick={onClear} disabled={loading}>
              {t('timetable.clearSlot')}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSave} loading={loading} disabled={!courseId}>
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </div>
      }
    >
      <div className="mb-4 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60">
        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
          {dayDisplay} · {slot.period.label}
        </p>
      </div>

      <div className="space-y-4">
        <FormField label={t('timetable.subject')} required>
          <Select value={courseId} onChange={(e) => {
            const id = e.target.value;
            setCourseId(id);
            const course = courses.find((c) => String(c.id) === id);
            if (course?.teacher_id && !teacherId) setTeacherId(String(course.teacher_id));
            if (course?.room && !room) setRoom(course.room);
          }} required>
            <option value="">{t('timetable.selectSubject')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('timetable.teacher')}>
          <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">{t('timetable.selectTeacher')}</option>
            {teachers.map((teach) => (
              <option key={teach.id} value={teach.id}>
                {teach.user?.name ?? `Teacher #${teach.id}`}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('timetable.classroom')}>
          <Input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={t('timetable.roomPlaceholder')}
          />
        </FormField>

        <FormField label={t('timetable.notes')}>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('timetable.notesPlaceholder')}
            rows={2}
          />
        </FormField>
      </div>
    </Modal>
  );
}
