import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { groupsAPI, studentsAPI, teachersAPI, coursesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { PageHeader, Card, Button, Badge } from '../../components/common/UI';

const GROUP_TYPE_VALUES = [
  { value: 'student', roles: ['super_admin', 'admin'] },
  { value: 'teacher', roles: ['super_admin', 'admin'] },
  { value: 'mixed', roles: ['super_admin', 'admin', 'teacher'] },
  { value: 'course', roles: ['super_admin', 'admin', 'teacher'] },
  { value: 'announcement', roles: ['super_admin', 'admin'] },
];

const AUDIENCE_VALUES = ['custom', 'all_students', 'final_year', 'scholarship'];

export default function CreateGroup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const isAdmin = hasRole('super_admin', 'admin');
  const isTeacher = hasRole('teacher') && !isAdmin;

  const groupTypes = useMemo(
    () =>
      GROUP_TYPE_VALUES.filter((item) => item.roles.some((r) => hasRole(r))).map((item) => ({
        value: item.value,
        label: t(`groupsPage.groupTypes.${item.value}`),
      })),
    [hasRole, t]
  );

  const audienceOptions = useMemo(
    () =>
      AUDIENCE_VALUES.map((value) => ({
        value,
        label: t(`groupsPage.audienceOptions.${value}`),
        description: t(`groupsPage.audienceDescriptions.${value}`),
      })),
    [t]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(isTeacher ? 'course' : 'student');
  const [audience, setAudience] = useState('custom');
  const [includeAllTeachers, setIncludeAllTeachers] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [allowStudentMessages, setAllowStudentMessages] = useState(true);
  const [allowStudentFiles, setAllowStudentFiles] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [presets, setPresets] = useState([]);
  const [teacherPresets, setTeacherPresets] = useState([]);
  const [courseStudents, setCourseStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  const showAudience = isAdmin && type !== 'course' && audience !== undefined;
  const manualMembers = isAdmin && audience === 'custom' && type !== 'course';
  const teacherManualPick = isTeacher && courseId;

  useEffect(() => {
    if (isAdmin) {
      groupsAPI.presets().then(({ data }) => setPresets(data.data ?? [])).catch(() => {});
      studentsAPI.list({ per_page: 200 }).then(({ data }) => setStudents(data.data ?? [])).catch(() => {});
      teachersAPI.list({ per_page: 100 }).then(({ data }) => setTeachers(data.data ?? [])).catch(() => {});
    }
    if (isTeacher) {
      groupsAPI.teacherPresets().then(({ data }) => setTeacherPresets(data.data ?? [])).catch(() => {});
    }
    coursesAPI.list({ per_page: 100 }).then(({ data }) => {
      let list = data.data ?? [];
      if (isTeacher) {
        list = list.filter((c) => c.teacher?.user_id === user?.id || c.teacher_id === user?.teacher?.id);
      }
      setCourses(list);
    }).catch(() => {});
  }, [isAdmin, isTeacher, user]);

  useEffect(() => {
    if (!isTeacher || !courseId) {
      setCourseStudents([]);
      return;
    }
    coursesAPI.students(courseId, { per_page: 200 })
      .then(({ data }) => setCourseStudents(data.data ?? []))
      .catch(() => setCourseStudents([]));
  }, [isTeacher, courseId]);

  const applyPreset = (preset) => {
    setName(preset.name);
    setDescription(preset.description || '');
    setType(preset.type || 'course');
    setAudience(preset.audience || 'custom');
    setIncludeAllTeachers(!!preset.include_all_teachers);
    if (preset.course_id) {
      setCourseId(String(preset.course_id));
    }
    if (preset.type === 'course') {
      setAudience('custom');
    }
    toast.success(t('groupsPage.presetApplied', { name: preset.name }));
  };

  const onCourseChange = (id) => {
    setCourseId(id);
    if (isTeacher && id) {
      const course = courses.find((c) => String(c.id) === String(id));
      if (course && !name.trim()) {
        setName(t('groupsPage.groupNameSuffix', { name: course.name }));
      }
    }
  };

  const toggleId = (list, setList, id) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        type,
        course_id: type === 'course' ? Number(courseId) || undefined : undefined,
        allow_student_messages: allowStudentMessages,
        allow_student_files: allowStudentFiles,
      };

      if (isAdmin && type !== 'course') {
        payload.audience = audience;
        if (type === 'mixed' && audience === 'all_students') {
          payload.include_all_teachers = includeAllTeachers;
        }
        if (audience === 'custom') {
          payload.student_ids = selectedStudents.length ? selectedStudents : undefined;
          payload.teacher_ids = selectedTeachers.length ? selectedTeachers : undefined;
        }
        if (type === 'mixed' && audience !== 'all_students' && selectedTeachers.length) {
          payload.teacher_ids = selectedTeachers;
        }
      } else if (isAdmin && type === 'course') {
        payload.audience = 'custom';
      } else if (isTeacher) {
        payload.type = 'course';
        payload.course_id = Number(courseId);
        payload.allow_discussions = true;
        if (selectedStudents.length) {
          payload.student_ids = selectedStudents;
        }
      }

      const { data } = await groupsAPI.create(payload);
      toast.success(t('groupsPage.groupCreated'));
      navigate(`/groups/${data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={t('groupsPage.createTitle')}
        subtitle={isAdmin ? t('groupsPage.createSubtitleAdmin') : t('groupsPage.createSubtitleTeacher')}
      />

      {isTeacher && teacherPresets.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary-500" />
            {t('groupsPage.courseTemplates')}
          </h3>
          <p className="text-xs text-surface-500 mb-3">{t('groupsPage.courseTemplatesHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teacherPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition"
              >
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-surface-500 mt-0.5">{p.course_code}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {isAdmin && presets.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary-500" />
            {t('groupsPage.quickPresets')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition"
              >
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{p.description}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          <label className="block text-sm">
            <span className="font-medium">{t('groupsPage.nameLabel')}</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('groupsPage.namePlaceholder')}
              className="mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">{t('groupsPage.descriptionLabel')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2"
            />
          </label>

          {!isTeacher && (
            <label className="block text-sm">
              <span className="font-medium">{t('groupsPage.groupTypeLabel')}</span>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  if (e.target.value === 'course') setAudience('custom');
                }}
                className="mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2"
              >
                {groupTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {showAudience && (
            <label className="block text-sm">
              <span className="font-medium">{t('groupsPage.studentAudienceLabel')}</span>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2"
              >
                {audienceOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-surface-500 mt-1">
                {audienceOptions.find((a) => a.value === audience)?.description}
              </p>
            </label>
          )}

          {isAdmin && type === 'mixed' && audience === 'all_students' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAllTeachers}
                onChange={(e) => setIncludeAllTeachers(e.target.checked)}
              />
              {t('groupsPage.includeAllTeachers')}
            </label>
          )}

          {(type === 'course' || isTeacher) && (
            <label className="block text-sm">
              <span className="font-medium">{t('common.course')}</span>
              <select
                required
                value={courseId}
                onChange={(e) => onCourseChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2"
              >
                <option value="">{t('groupsPage.selectCourse')}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>
          )}

          {audience !== 'custom' && isAdmin && type !== 'course' && (
            <div className="rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 p-3 text-sm text-primary-800 dark:text-primary-200">
              {t('groupsPage.autoEnrollHint')}
              {type === 'mixed' && includeAllTeachers && t('groupsPage.autoEnrollTeachersHint')}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowStudentMessages}
                onChange={(e) => setAllowStudentMessages(e.target.checked)}
              />
              {t('groupsPage.allowStudentMessages')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowStudentFiles}
                onChange={(e) => setAllowStudentFiles(e.target.checked)}
              />
              {t('groupsPage.allowStudentFiles')}
            </label>
          </div>

          {teacherManualPick && (
            <div>
              <p className="text-sm font-medium mb-1">{t('groupsPage.studentsOptional')}</p>
              <p className="text-xs text-surface-500 mb-2">{t('groupsPage.studentsOptionalHint')}</p>
              <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-1">
                {courseStudents.length === 0 ? (
                  <p className="text-xs text-surface-500 p-2">{t('groupsPage.noEnrolledStudents')}</p>
                ) : (
                  courseStudents.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => toggleId(selectedStudents, setSelectedStudents, s.id)}
                      />
                      {s.user?.name || s.student_id}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {manualMembers && (
            <>
              <div>
                <p className="text-sm font-medium mb-2">{t('groupsPage.addStudentsOptional')}</p>
                <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-1">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => toggleId(selectedStudents, setSelectedStudents, s.id)}
                      />
                      {s.user?.name || s.student_id}
                      {s.grade_level && (
                        <Badge color="gray" size="sm">{s.grade_level}</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              {(type === 'mixed' || type === 'teacher') && (
                <div>
                  <p className="text-sm font-medium mb-2">{t('groupsPage.addTeachersOptional')}</p>
                  <div className="max-h-40 overflow-y-auto border rounded-xl p-2 space-y-1">
                    {teachers.map((teacher) => (
                      <label key={teacher.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.id)}
                          onChange={() => toggleId(selectedTeachers, setSelectedTeachers, teacher.id)}
                        />
                        {teacher.user?.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? t('groupsPage.creating') : t('groupsPage.createGroup')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/groups')}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
