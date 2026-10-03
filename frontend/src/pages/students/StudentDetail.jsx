import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPenToSquare,
  faEnvelope,
  faPhone,
  faGraduationCap,
  faBook,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';
import { studentsAPI } from '../../services/api';
import AcademicBulletinPanel from '../../components/bulletins/AcademicBulletinPanel';
import { useUIStore } from '../../store';
import { chartDefaults, gridColor, textColor } from '../../utils/chartTheme';
import {
  Card,
  Badge,
  Avatar,
  Button,
  Tabs,
  Table,
  GradeTag,
  AttendanceBadge,
  ProgressBar,
} from '../../components/common/UI';
import StudentFormModal from '../../components/students/StudentFormModal';

ChartJS.register(
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const GRADE_TYPES = ['exam', 'quiz', 'homework', 'project'];

const GRADE_TYPE_LABEL_KEYS = {
  exam: 'gradesPage.typeExam',
  quiz: 'gradesPage.typeQuiz',
  homework: 'gradesPage.typeHomework',
  project: 'gradesPage.typeProject',
};

const TYPE_BADGE = {
  exam: 'danger',
  quiz: 'warning',
  homework: 'info',
  project: 'purple',
};

function statusBadge(status) {
  const map = { active: 'success', inactive: 'gray', graduated: 'primary' };
  return map[status] || 'gray';
}

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatWeekdayDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function aggregateByType(grades) {
  return GRADE_TYPES.map((type) => {
    const items = grades.filter((g) => g.type === type && g.score != null && g.max_score > 0);
    if (!items.length) return 0;
    const avg =
      items.reduce((sum, g) => {
        const pct = g.percentage ?? (Number(g.score) / Number(g.max_score)) * 100;
        return sum + pct;
      }, 0) / items.length;
    return Math.round(avg);
  });
}

function attendanceCounts(records) {
  return records.reduce(
    (acc, r) => {
      const key = r.status || 'present';
      if (acc[key] !== undefined) acc[key] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0 }
  );
}

export default function StudentDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useUIStore();

  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const [detailRes, gradesRes, attendanceRes] = await Promise.all([
        studentsAPI.get(id),
        studentsAPI.grades(id, { per_page: 100 }),
        studentsAPI.attendance(id, { per_page: 100 }),
      ]);
      setStudent(detailRes.data.data);
      setStats(detailRes.data.stats);
      setGrades(gradesRes.data.data ?? []);
      setAttendance(attendanceRes.data.data ?? []);
    } catch {
      toast.error(t('students.loadDetailFailed'));
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const courses = student?.courses ?? [];
  const counts = useMemo(() => attendanceCounts(attendance), [attendance]);
  const attendanceTotal = Object.values(counts).reduce((a, b) => a + b, 0);

  const radarData = useMemo(
    () => ({
      labels: GRADE_TYPES.map((type) => t(GRADE_TYPE_LABEL_KEYS[type] || type)),
      datasets: [
        {
          label: t('students.chartAvgPercent'),
          data: aggregateByType(grades),
          backgroundColor: 'rgba(99,102,241,0.25)',
          borderColor: '#6366f1',
          borderWidth: 2,
          pointBackgroundColor: '#6366f1',
        },
      ],
    }),
    [grades, t]
  );

  const trendGrades = useMemo(() => {
    return [...grades]
      .filter((g) => g.score != null)
      .sort((a, b) => new Date(b.graded_at || 0) - new Date(a.graded_at || 0))
      .slice(0, 10)
      .reverse();
  }, [grades]);

  const trendData = useMemo(
    () => ({
      labels: trendGrades.map((g) => g.title?.slice(0, 12) || formatDate(g.graded_at)),
      datasets: [
        {
          label: t('students.chartScorePercent'),
          data: trendGrades.map((g) =>
            g.percentage != null
              ? g.percentage
              : Math.round((Number(g.score) / Number(g.max_score)) * 100)
          ),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
      ],
    }),
    [trendGrades, t]
  );

  const tabs = useMemo(
    () => [
      { key: 'overview', label: t('detailPage.overview') },
      { key: 'grades', label: t('detailPage.grades'), count: grades.length },
      { key: 'attendance', label: t('detailPage.attendance'), count: attendance.length },
      { key: 'courses', label: t('detailPage.courses'), count: courses.length },
    ],
    [t, grades.length, attendance.length, courses.length]
  );

  const gradeColumns = useMemo(
    () => [
      {
        key: 'course',
        label: t('gradesPage.columnCourse'),
        render: (_, row) => row.course?.name || '—',
      },
      {
        key: 'type',
        label: t('gradesPage.columnType'),
        render: (val) => (
          <Badge color={TYPE_BADGE[val] || 'gray'} size="xs">
            {t(GRADE_TYPE_LABEL_KEYS[val] || val, { defaultValue: val })}
          </Badge>
        ),
      },
      { key: 'title', label: t('gradesPage.columnTitle') },
      {
        key: 'score',
        label: t('gradesPage.columnScore'),
        render: (_, row) => `${row.score ?? '—'}/${row.max_score ?? '—'}`,
      },
      {
        key: 'letter',
        label: t('detailPage.grade'),
        render: (_, row) => (
          <GradeTag
            grade={row.letter_grade || '—'}
            percentage={row.percentage ?? 0}
          />
        ),
      },
      {
        key: 'graded_at',
        label: t('gradesPage.columnDate'),
        render: (val) => formatDate(val),
      },
      {
        key: 'feedback',
        label: t('detailPage.feedback'),
        render: (val) => (
          <span className="text-surface-500 line-clamp-1 max-w-[160px]">
            {val || '—'}
          </span>
        ),
      },
    ],
    [t]
  );

  const attendanceColumns = useMemo(
    () => [
      {
        key: 'course',
        label: t('gradesPage.columnCourse'),
        render: (_, row) => row.course?.name || '—',
      },
      {
        key: 'date',
        label: t('gradesPage.columnDate'),
        render: (val) => {
          const { day, date } = formatWeekdayDate(val);
          return (
            <div>
              <p className="font-medium text-surface-800 dark:text-surface-200">{day}</p>
              <p className="text-xs text-surface-400">{date}</p>
            </div>
          );
        },
      },
      {
        key: 'status',
        label: t('common.status'),
        render: (val) => <AttendanceBadge status={val} />,
      },
      {
        key: 'method',
        label: t('detailPage.method'),
        render: (val) => (
          <Badge color="gray" size="xs">
            {val || 'manual'}
          </Badge>
        ),
      },
      {
        key: 'notes',
        label: t('timetable.notes'),
        render: (val) => val || '—',
      },
    ],
    [t]
  );

  const radarOptions = useMemo(
    () => ({
      ...chartDefaults,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: gridColor() },
          angleLines: { color: gridColor() },
          pointLabels: { color: textColor(), font: { size: 11 } },
        },
      },
    }),
    [theme]
  );

  const lineOptions = useMemo(
    () => ({
      ...chartDefaults,
      scales: {
        x: {
          grid: { color: gridColor() },
          ticks: { color: textColor(), font: { size: 10 }, maxRotation: 45 },
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: gridColor() },
          ticks: { color: textColor(), font: { size: 11 } },
        },
      },
    }),
    [theme]
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="h-40 bg-surface-200 dark:bg-surface-700 rounded-2xl" />
        <div className="h-64 bg-surface-200 dark:bg-surface-700 rounded-2xl" />
      </div>
    );
  }

  if (!student) return null;

  const user = student.user;
  const rate =
    stats?.attendance_rate ?? student.attendance_rate ?? counts.present
      ? Math.round(
          ((counts.present + counts.late + counts.excused) / attendanceTotal) * 100
        )
      : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-500 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          {t('students.backToStudents')}
        </button>
        <Button variant="outline" icon={faPenToSquare} onClick={() => setEditOpen(true)}>
          {t('common.edit')}
        </Button>
      </div>

      <Card className="overflow-hidden" padding={false}>
        <div className="p-6 lg:p-8 bg-gradient-to-br from-primary-500/5 to-transparent">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
            <Avatar
              src={user?.avatar_url}
              name={user?.name}
              className="!w-24 !h-24 !rounded-2xl !text-2xl"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
                  {user?.name}
                </h1>
                <Badge color={statusBadge(student.enrollment_status)} dot>
                  {student.enrollment_status}
                </Badge>
              </div>
              <p className="font-mono text-sm text-surface-500 mt-1">{student.student_id}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-surface-600 dark:text-surface-400">
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-surface-400" />
                  {user?.email}
                </span>
                {user?.phone && (
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faPhone} className="w-4 h-4 text-surface-400" />
                    {user.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faGraduationCap} className="w-4 h-4 text-surface-400" />
                  {student.grade_level}
                  {student.section ? ` · ${t('students.sectionLabel', { section: student.section })}` : ''}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 lg:gap-6">
              {[
                {
                  label: t('students.avgGrade'),
                  value:
                    stats?.average_grade != null
                      ? `${Number(stats.average_grade).toFixed(1)}%`
                      : '—',
                },
                {
                  label: t('detailPage.attendance'),
                  value:
                    stats?.attendance_rate != null
                      ? `${Number(stats.attendance_rate).toFixed(1)}%`
                      : `${rate}%`,
                },
                { label: t('detailPage.courses'), value: stats?.courses_count ?? courses.length },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center px-4 py-3 rounded-xl bg-white/80 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60"
                >
                  <p className="text-xs text-surface-500">{s.label}</p>
                  <p className="font-display text-xl font-bold text-surface-900 dark:text-white mt-1">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <AcademicBulletinPanel
        studentId={student.id}
        studentCode={student.student_id}
        variant="admin"
      />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title={t('students.performanceByType')} subtitle={t('students.avgScorePercent')}>
              <div className="chart-responsive">
                <Radar data={radarData} options={radarOptions} />
              </div>
            </Card>
            <Card title={t('students.gradeTrend')} subtitle={t('students.lastTenGrades')}>
              <div className="chart-responsive">
                {trendGrades.length ? (
                  <Line data={trendData} options={lineOptions} />
                ) : (
                  <p className="text-sm text-surface-400 text-center py-16">
                    {t('dashboard.noGradesYet')}
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title={t('students.personalInformation')}>
              <dl className="grid grid-cols-1 xs:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-surface-400">{t('students.dateOfBirth')}</dt>
                  <dd className="font-medium text-surface-800 dark:text-surface-200 mt-0.5">
                    {formatDate(user?.date_of_birth)}
                  </dd>
                </div>
                <div>
                  <dt className="text-surface-400">{t('students.gender')}</dt>
                  <dd className="font-medium text-surface-800 dark:text-surface-200 mt-0.5 capitalize">
                    {user?.gender || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-surface-400">{t('students.guardian')}</dt>
                  <dd className="font-medium text-surface-800 dark:text-surface-200 mt-0.5">
                    {student.guardian_name || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-surface-400">{t('students.guardianPhone')}</dt>
                  <dd className="font-medium text-surface-800 dark:text-surface-200 mt-0.5">
                    {student.guardian_phone || '—'}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card title={t('students.attendanceSummary')}>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-surface-500">{t('students.overallRate')}</span>
                    <span className="font-semibold text-surface-900 dark:text-white">
                      {Number(stats?.attendance_rate ?? rate).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={Number(stats?.attendance_rate ?? rate)}
                    color="success"
                    size="lg"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'present', label: t('common.present'), color: 'text-success-500 bg-success-500/10' },
                    { key: 'absent', label: t('common.absent'), color: 'text-danger-500 bg-danger-500/10' },
                    { key: 'late', label: t('common.late'), color: 'text-warning-500 bg-warning-500/10' },
                    { key: 'excused', label: t('common.excused'), color: 'text-info-500 bg-info-500/10' },
                  ].map(({ key, label, color }) => (
                    <div key={key} className={`rounded-xl p-3 text-center ${color}`}>
                      <p className="text-2xl font-bold">{counts[key]}</p>
                      <p className="text-xs font-medium mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'grades' && (
        <Card padding={false}>
          <Table
            columns={gradeColumns}
            data={grades}
            emptyMessage={t('students.noGradesRecordedDetail')}
          />
        </Card>
      )}

      {activeTab === 'attendance' && (
        <Card padding={false}>
          <Table
            columns={attendanceColumns}
            data={attendance}
            emptyMessage={t('studentPages.noAttendanceRecords')}
          />
        </Card>
      )}

      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.length ? (
            courses.map((course) => (
              <Card key={course.id} className="hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-surface-900 dark:text-white">
                      {course.name}
                    </h3>
                    <p className="font-mono text-xs text-primary-500 mt-0.5">{course.code}</p>
                  </div>
                  <Badge color={course.status === 'active' ? 'success' : 'gray'} size="xs">
                    {course.status}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm text-surface-500">
                  <p className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faBook} className="w-3.5 h-3.5" />
                    {course.teacher?.user?.name || t('students.noTeacherAssigned')}
                  </p>
                  <p>
                    {course.credits ?? 0} {t('common.credits')} · {course.semester || '—'}
                  </p>
                </div>
                <Link
                  to={`/courses/${course.id}`}
                  className="inline-block mt-4 text-xs text-primary-500 hover:text-primary-600 font-medium"
                >
                  {t('students.viewCourseLink')}
                </Link>
              </Card>
            ))
          ) : (
            <Card className="sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-surface-400 text-center py-8">
                {t('students.notEnrolledInCourses')}
              </p>
            </Card>
          )}
        </div>
      )}

      <StudentFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
        onSuccess={load}
      />
    </div>
  );
}
