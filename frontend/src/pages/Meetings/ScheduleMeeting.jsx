import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { meetingsAPI, coursesAPI, studentsAPI, teachersAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { PageHeader, Card, Button } from '../../components/common/UI';

export default function ScheduleMeeting() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const isAdmin = hasRole('super_admin', 'admin');
  const isTeacher = hasRole('teacher') && !isAdmin;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [courseId, setCourseId] = useState('');
  const [inviteCourseStudents, setInviteCourseStudents] = useState(true);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [courseStudents, setCourseStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    coursesAPI.list({ per_page: 100 }).then(({ data }) => {
      let list = data.data ?? [];
      if (isTeacher) {
        list = list.filter((c) => c.teacher?.user_id === user?.id);
      }
      setCourses(list);
    }).catch(() => {});

    if (isAdmin) {
      studentsAPI.list({ per_page: 200 }).then(({ data }) => setStudents(data.data ?? [])).catch(() => {});
      teachersAPI.list({ per_page: 100 }).then(({ data }) => setTeachers(data.data ?? [])).catch(() => {});
    }
  }, [isAdmin, isTeacher, user]);

  useEffect(() => {
    if (!courseId) {
      setCourseStudents([]);
      return;
    }
    coursesAPI.students(courseId, { per_page: 200 })
      .then(({ data }) => setCourseStudents(data.data ?? []))
      .catch(() => setCourseStudents([]));
    const course = courses.find((c) => String(c.id) === String(courseId));
    if (course && !title.trim()) {
      setTitle(t('meetingsPage.sessionTitleSuffix', { name: course.name }));
    }
  }, [courseId, courses, title, t]);

  const toggle = (list, setList, id) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        description: description || undefined,
        scheduled_at: scheduledAt || undefined,
        ends_at: endsAt || undefined,
        course_id: courseId ? Number(courseId) : undefined,
        invite_course_students: inviteCourseStudents,
      };

      if (isTeacher) {
        payload.student_ids = selectedStudents.length
          ? selectedStudents
          : undefined;
      } else if (isAdmin) {
        payload.student_ids = selectedStudents.length ? selectedStudents : undefined;
        payload.teacher_ids = selectedTeachers.length ? selectedTeachers : undefined;
      }

      const { data } = await meetingsAPI.create(payload);
      toast.success(t('meetingsPage.meetingScheduled'));
      navigate(`/meetings/${data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('meetingsPage.scheduleFailed'));
    } finally {
      setSaving(false);
    }
  };

  const studentList = isTeacher ? courseStudents : students;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={t('meetingsPage.scheduleTitle')}
        subtitle={isTeacher ? t('meetingsPage.scheduleSubtitleTeacher') : t('meetingsPage.scheduleSubtitleAdmin')}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          <label className="block text-sm">
            <span className="font-medium">{t('common.title')}</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('meetingsPage.titlePlaceholder')}
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-surface-800"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">{t('meetingsPage.descriptionLabel')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-surface-800"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium">{t('meetingsPage.startsLabel')}</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-surface-800"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t('meetingsPage.endsLabel')}</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-surface-800"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium">
              {isTeacher ? t('meetingsPage.courseRequired') : t('meetingsPage.courseOptional')}
            </span>
            <select
              required={isTeacher}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-surface-800"
            >
              <option value="">{t('groupsPage.selectCourse')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>

          {courseId && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inviteCourseStudents}
                onChange={(e) => setInviteCourseStudents(e.target.checked)}
              />
              {t('meetingsPage.inviteAllEnrolled')}
            </label>
          )}

          {studentList.length > 0 && !inviteCourseStudents && (
            <div>
              <p className="text-sm font-medium mb-2">{t('meetingsPage.inviteStudents')}</p>
              <div className="max-h-36 overflow-y-auto border rounded-xl p-2 space-y-1">
                {studentList.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() => toggle(selectedStudents, setSelectedStudents, s.id)}
                    />
                    {s.user?.name || s.student_id}
                  </label>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div>
              <p className="text-sm font-medium mb-2">{t('meetingsPage.inviteTeachersOptional')}</p>
              <div className="max-h-28 overflow-y-auto border rounded-xl p-2 space-y-1">
                {teachers.map((teacher) => (
                  <label key={teacher.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(teacher.id)}
                      onChange={() => toggle(selectedTeachers, setSelectedTeachers, teacher.id)}
                    />
                    {teacher.user?.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? t('meetingsPage.saving') : t('meetingsPage.createMeeting')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/meetings')}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
