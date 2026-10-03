import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { gradesAPI, coursesAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Input, Select, Textarea, Button } from '../common/UI';

const TYPE_VALUES = ['exam', 'quiz', 'homework', 'project'];

const TYPE_KEYS = {
  exam: 'gradesPage.typeExam',
  quiz: 'gradesPage.typeQuiz',
  homework: 'gradesPage.typeHomework',
  project: 'gradesPage.typeProject',
};

const emptyForm = {
  student_id: '',
  course_id: '',
  type: 'exam',
  title: '',
  score: '',
  max_score: '100',
  graded_at: new Date().toISOString().slice(0, 10),
  feedback: '',
};

export default function GradeFormModal({ isOpen, onClose, onSuccess, defaultCourseId = '' }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...emptyForm, course_id: defaultCourseId });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  const gradeTypes = useMemo(
    () => TYPE_VALUES.map((value) => ({ value, label: t(TYPE_KEYS[value]) })),
    [t]
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...emptyForm, course_id: defaultCourseId });
    setErrors({});
    coursesAPI.list({ per_page: 100 }).then((res) => setCourses(res.data.data ?? [])).catch(() => {});
  }, [isOpen, defaultCourseId]);

  useEffect(() => {
    if (!form.course_id) {
      setStudents([]);
      return;
    }
    coursesAPI.get(form.course_id).then((res) => {
      setStudents(res.data.data?.students ?? []);
    }).catch(() => setStudents([]));
  }, [form.course_id]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const { data } = await gradesAPI.create({
        ...form,
        score: Number(form.score),
        max_score: Number(form.max_score) || 100,
      });
      toast.success(data.message || t('gradesPage.formRecorded'));
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
      title={t('gradesPage.formRecordTitle')}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button type="submit" form="grade-form" loading={loading}>{t('gradesPage.formSaveGrade')}</Button>
        </div>
      }
    >
      <form id="grade-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label={t('common.course')} error={errors.course_id} required>
          <Select value={form.course_id} onChange={(e) => setField('course_id', e.target.value)} error={errors.course_id} required>
            <option value="">{t('gradesPage.formSelectCourse')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('gradesPage.columnStudent')} error={errors.student_id} required>
          <Select value={form.student_id} onChange={(e) => setField('student_id', e.target.value)} error={errors.student_id} required disabled={!form.course_id}>
            <option value="">{t('gradesPage.formSelectStudent')}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.user?.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('common.type')} error={errors.type} required>
          <Select value={form.type} onChange={(e) => setField('type', e.target.value)} error={errors.type} required>
            {gradeTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </FormField>
        <FormField label={t('common.title')} error={errors.title} required>
          <Input value={form.title} onChange={(e) => setField('title', e.target.value)} error={errors.title} required />
        </FormField>
        <FormField label={t('common.score')} error={errors.score} required>
          <Input type="number" step="0.01" min="0" value={form.score} onChange={(e) => setField('score', e.target.value)} error={errors.score} required />
        </FormField>
        <FormField label={t('gradesPage.formMaxScore')} error={errors.max_score} required>
          <Input type="number" step="0.01" min="1" value={form.max_score} onChange={(e) => setField('max_score', e.target.value)} error={errors.max_score} className="font-mono" required />
        </FormField>
        <FormField label={t('gradesPage.formGradedAt')} error={errors.graded_at} required>
          <Input type="date" value={form.graded_at} onChange={(e) => setField('graded_at', e.target.value)} error={errors.graded_at} required />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t('gradesPage.formFeedback')} error={errors.feedback}>
            <Textarea rows={3} value={form.feedback} onChange={(e) => setField('feedback', e.target.value)} error={errors.feedback} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
