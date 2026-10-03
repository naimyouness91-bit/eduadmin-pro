import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPenToSquare,
  faBook,
  faUserPlus,
  faCalendar,
  faDoorOpen,
  faChalkboardTeacher,
} from '@fortawesome/free-solid-svg-icons';
import { coursesAPI, gradesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { StudentPageShell } from '../../components/student/StudentUI';
import {
  Card,
  Badge,
  Avatar,
  Button,
  Tabs,
  Table,
  GradeTag,
  ProgressBar,
} from '../../components/common/UI';
import CourseFormModal from '../../components/courses/CourseFormModal';
import EnrollStudentsModal from '../../components/courses/EnrollStudentsModal';

const DAY_KEYS = [
  '',
  'detailPage.dayMonday',
  'detailPage.dayTuesday',
  'detailPage.dayWednesday',
  'detailPage.dayThursday',
  'detailPage.dayFriday',
  'detailPage.daySaturday',
  'detailPage.daySunday',
];

function statusColor(status) {
  const map = { active: 'success', inactive: 'gray', archived: 'warning' };
  return map[status] || 'gray';
}

function capacityColor(pct) {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'success';
}

function formatTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

export default function CourseDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const isStudent = hasRole('student');
  const canManageCourses = hasRole('admin') || hasRole('super_admin');
  const [course, setCourse] = useState(null);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [courseRes, gradesRes] = await Promise.all([
        coursesAPI.get(id),
        gradesAPI.list({ course_id: id, per_page: 50 }),
      ]);
      setCourse(courseRes.data.data);
      setEnrolledCount(courseRes.data.enrolled_count ?? courseRes.data.data?.students?.length ?? 0);
      setGrades(gradesRes.data.data ?? []);
    } catch {
      toast.error(t('courses.loadDetailFailed'));
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleUnenroll = async (studentId) => {
    if (!window.confirm(t('courses.unenrollConfirm'))) return;
    try {
      const { data } = await coursesAPI.unenroll(id, { student_ids: [studentId] });
      toast.success(data.message || t('courses.unenrolledSuccess'));
      setCourse(data.data);
      setEnrolledCount(data.data?.students?.length ?? 0);
    } catch {
      toast.error(t('courses.unenrollFailed'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="h-40 bg-surface-200 dark:bg-surface-700 rounded-2xl" />
      </div>
    );
  }

  if (!course) return null;

  const students = course.students ?? [];
  const schedules = course.schedules ?? [];
  const max = course.max_students || 30;
  const enrolled = enrolledCount || students.length;
  const fillPct = max > 0 ? Math.min(100, Math.round((enrolled / max) * 100)) : 0;

  const visibleGrades = isStudent
    ? grades.filter((g) => g.student_id === user?.student?.id)
    : grades;

  const tabs = isStudent
    ? [
        { key: 'overview', label: t('detailPage.overview') },
        { key: 'schedule', label: t('detailPage.schedule'), count: schedules.length },
        { key: 'grades', label: t('detailPage.myGrades'), count: visibleGrades.length },
      ]
    : [
        { key: 'overview', label: t('detailPage.overview') },
        { key: 'students', label: t('detailPage.students'), count: students.length },
        { key: 'schedule', label: t('detailPage.schedule'), count: schedules.length },
        { key: 'grades', label: t('detailPage.grades'), count: grades.length },
      ];

  const gradeColumns = [
    ...(isStudent
      ? []
      : [{ key: 'student', label: t('detailPage.student'), render: (_, row) => row.student?.user?.name || '—' }]),
    {
      key: 'type',
      label: t('gradesPage.columnType'),
      render: (val) => <Badge color="gray" size="xs">{val}</Badge>,
    },
    { key: 'title', label: t('gradesPage.columnTitle') },
    {
      key: 'score',
      label: t('gradesPage.columnScore'),
      render: (_, row) => `${row.score}/${row.max_score}`,
    },
    {
      key: 'grade',
      label: t('detailPage.grade'),
      render: (_, row) => (
        <GradeTag grade={row.letter_grade || '—'} percentage={row.percentage ?? 0} />
      ),
    },
  ];

  const dayLabel = (dayOfWeek) => {
    const key = DAY_KEYS[dayOfWeek];
    return key ? t(key) : t('detailPage.dayFallback', { day: dayOfWeek });
  };

  const body = (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" onClick={() => navigate('/courses')}
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-500">
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          {t('courses.backToCourses')}
        </button>
        {!isStudent && canManageCourses && (
          <Button variant="outline" icon={faPenToSquare} onClick={() => setEditOpen(true)}>{t('common.edit')}</Button>
        )}
      </div>

      <Card padding={false}>
        <div className="p-6 lg:p-8 bg-gradient-to-br from-primary-500/10 via-transparent to-purple-500/10">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
              <FontAwesomeIcon icon={faBook} className="w-9 h-9 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">{course.name}</h1>
              <p className="font-mono text-primary-500 mt-1">{course.code}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-surface-600 dark:text-surface-400">
                {course.room && (
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faDoorOpen} className="w-4 h-4 text-surface-400" />
                    {course.room}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faChalkboardTeacher} className="w-4 h-4 text-surface-400" />
                  {course.teacher?.user?.name || t('courses.unassigned')}
                </span>
                <Badge color={statusColor(course.status)} size="sm">{course.status}</Badge>
              </div>
            </div>
            <div className="w-full lg:w-56">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-surface-500">{t('courses.capacity')}</span>
                <span className="font-semibold text-surface-900 dark:text-white">
                  {enrolled}/{max}
                </span>
              </div>
              <ProgressBar value={fillPct} color={capacityColor(fillPct)} size="lg" />
              <p className="text-xs text-surface-400 mt-1 text-right">{t('courses.percentFull', { pct: fillPct })}</p>
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title={t('courses.courseStatistics')}>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              {[
                { label: t('courses.enrolledLabel'), value: enrolled },
                { label: t('courses.maxCapacity'), value: max },
                { label: t('common.credits'), value: course.credits ?? '—' },
                { label: t('courses.gradeRecords'), value: grades.length },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800">
                  <p className="text-xs text-surface-500">{s.label}</p>
                  <p className="font-display text-xl font-bold text-surface-900 dark:text-white mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card title={t('courses.courseInformation')}>
            <dl className="space-y-3 text-sm">
              {[
                [t('courses.gradeLevel'), course.grade_level],
                [t('courses.semester'), course.semester],
                [t('courses.academicYear'), course.academic_year],
                [t('courses.description'), course.description || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-2 last:border-0">
                  <dt className="text-surface-500">{label}</dt>
                  <dd className="font-medium text-surface-800 dark:text-surface-200 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <Card
          title={t('courses.enrolledStudents')}
          actions={
            canManageCourses ? (
            <Button size="sm" icon={faUserPlus} onClick={() => setEnrollOpen(true)}>
              {t('courses.enrollStudents')}
            </Button>
            ) : null
          }
          padding={false}
        >
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {students.length ? (
              students.map((student) => (
                <div key={student.id} className="flex items-center gap-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                  <Avatar src={student.user?.avatar_url} name={student.user?.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-900 dark:text-white">{student.user?.name}</p>
                    <p className="font-mono text-xs text-surface-400">{student.student_id}</p>
                  </div>
                  <Badge color={statusColor(student.pivot?.status || 'active')} size="xs">
                    {student.pivot?.status || 'enrolled'}
                  </Badge>
                  {canManageCourses && (
                  <Button variant="ghost" size="sm" onClick={() => handleUnenroll(student.id)}>
                    {t('courses.unenroll')}
                  </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-400 text-center py-10">{t('courses.noStudentsEnrolled')}</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.length ? (
            schedules.map((slot) => (
              <Card key={slot.id}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendar} className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900 dark:text-white">
                      {dayLabel(slot.day_of_week)}
                    </p>
                    <p className="text-sm text-surface-500 mt-1">
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </p>
                    {slot.room && (
                      <span className="mt-2 inline-block">
                        <Badge color="gray" size="xs">{slot.room}</Badge>
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-surface-400 text-center py-8">{t('courses.noScheduleSlots')}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'grades' && (
        <Card padding={false}>
          <Table columns={gradeColumns} data={visibleGrades} emptyMessage={t('courses.noGradesForCourse')} />
        </Card>
      )}

      {canManageCourses && (
        <>
          <CourseFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} course={course} onSuccess={load} />
          <EnrollStudentsModal
            isOpen={enrollOpen}
            onClose={() => setEnrollOpen(false)}
            courseId={id}
            enrolledIds={students.map((s) => s.id)}
            onSuccess={(updated) => {
              if (updated) {
                setCourse(updated);
                setEnrolledCount(updated.students?.length ?? 0);
              } else load();
            }}
          />
        </>
      )}
    </div>
  );

  if (isStudent) {
    return (
      <StudentPageShell title={course.name} subtitle={`${course.code} · ${course.teacher?.user?.name || t('courses.unassigned')}`}>
        {body}
      </StudentPageShell>
    );
  }

  return body;
}
