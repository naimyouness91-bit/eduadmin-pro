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
  faBook,
  faBriefcase,
  faCalendar,
  faDollarSign,
  faGraduationCap,
} from '@fortawesome/free-solid-svg-icons';
import { teachersAPI } from '../../services/api';
import { Card, Badge, Avatar, Button } from '../../components/common/UI';
import TeacherFormModal from '../../components/teachers/TeacherFormModal';

function employmentBadge(type) {
  const map = { full_time: 'success', part_time: 'warning', contract: 'info' };
  return map[type] || 'gray';
}

function formatEmployment(type, t) {
  if (!type) return '—';
  const keys = {
    full_time: 'teachers.employmentFullTime',
    part_time: 'teachers.employmentPartTime',
    contract: 'teachers.employmentContract',
  };
  if (keys[type]) return t(keys[type]);
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function TeacherDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await teachersAPI.get(id);
      setTeacher(data.data);
    } catch {
      toast.error(t('teachers.loadDetailFailed'));
      navigate('/teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const courses = teacher?.courses ?? [];
  const totalStudents = useMemo(
    () => courses.reduce((s, c) => s + (c.students_count ?? 0), 0),
    [courses]
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="h-48 bg-surface-200 dark:bg-surface-700 rounded-2xl" />
      </div>
    );
  }

  if (!teacher) return null;
  const user = teacher.user;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" onClick={() => navigate('/teachers')}
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-500">
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          {t('teachers.backToTeachers')}
        </button>
        <Button variant="outline" icon={faPenToSquare} onClick={() => setEditOpen(true)}>{t('common.edit')}</Button>
      </div>

      <Card padding={false}>
        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <Avatar src={user?.avatar_url} name={user?.name} className="!w-24 !h-24 !rounded-2xl !text-2xl" />
            <div className="flex-1">
              <p className="text-primary-500 font-semibold text-sm">{teacher.specialization}</p>
              <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white mt-1">{user?.name}</h1>
              <p className="font-mono text-sm text-surface-500 mt-1">{teacher.teacher_id}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge color={employmentBadge(teacher.employment_type)} dot>
                  {formatEmployment(teacher.employment_type, t)}
                </Badge>
                {teacher.department && <Badge color="primary" size="sm">{teacher.department}</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('detailPage.courses'), value: courses.length },
                { label: t('common.students'), value: totalStudents },
                { label: t('teachers.experience'), value: t('teachers.experienceYears', { count: teacher.experience_years ?? 0 }) },
              ].map((s) => (
                <div key={s.label} className="text-center px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                  <p className="text-xs text-surface-500">{s.label}</p>
                  <p className="font-display text-xl font-bold text-surface-900 dark:text-white mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {teacher.bio && (
        <Card title={t('teachers.bio')}>
          <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{teacher.bio}</p>
        </Card>
      )}

      <Card title={t('teachers.professionalInformation')}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {[
            { icon: faEnvelope, label: t('teachers.email'), value: user?.email },
            { icon: faPhone, label: t('teachers.phone'), value: user?.phone || '—' },
            { icon: faGraduationCap, label: t('teachers.qualification'), value: teacher.qualification || '—' },
            { icon: faBriefcase, label: t('common.department'), value: teacher.department || '—' },
            { icon: faCalendar, label: t('teachers.joiningDate'), value: formatDate(teacher.joining_date) },
            { icon: faDollarSign, label: t('teachers.salary'), value: teacher.salary != null ? `$${Number(teacher.salary).toLocaleString()}` : '—' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4 text-surface-400" />
              </div>
              <div>
                <dt className="text-surface-400 text-xs">{item.label}</dt>
                <dd className="font-medium text-surface-800 dark:text-surface-200 mt-0.5">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>

      <Card title={t('teachers.assignedCourses')} subtitle={t('teachers.coursesCountSubtitle', { count: courses.length })}>
        {courses.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`}
                className="flex items-start gap-4 p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-500/40 hover:bg-primary-500/5 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <FontAwesomeIcon icon={faBook} className="w-5 h-5 text-primary-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-surface-900 dark:text-white truncate">{course.name}</p>
                  <p className="font-mono text-xs text-primary-500 mt-0.5">{course.code}</p>
                  <p className="text-xs text-surface-500 mt-2">
                    {user?.name} · {t('courses.studentsCount', { count: course.students_count ?? 0 })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-surface-400 text-center py-6">{t('teachers.noCoursesAssigned')}</p>
        )}
      </Card>

      <TeacherFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} teacher={teacher} onSuccess={load} />
    </div>
  );
}
