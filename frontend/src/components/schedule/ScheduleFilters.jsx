import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faBook,
  faChalkboardUser,
  faUserGraduate,
} from '@fortawesome/free-solid-svg-icons';

export default function ScheduleFilters({
  filters,
  onChange,
  courses = [],
  teachers = [],
  students = [],
  showTeacherFilter,
  showStudentFilter,
}) {
  const { t } = useTranslation();
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-white/80 dark:bg-surface-900/75 backdrop-blur-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300">
        <FontAwesomeIcon icon={faFilter} className="w-3.5 h-3.5 text-primary-500" />
        {t('scheduleUi.filtersTitle')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder={t('scheduleUi.searchPlaceholder')}
            className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 ps-9 pe-3 py-2 text-sm"
          />
        </div>

        <label className="block">
          <span className="sr-only">{t('common.course')}</span>
          <div className="relative">
            <FontAwesomeIcon icon={faBook} className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
            <select
              value={filters.courseId}
              onChange={(e) => set('courseId', e.target.value)}
              className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 ps-9 pe-3 py-2 text-sm appearance-none"
            >
              <option value="">{t('common.allCourses')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </label>

        {showTeacherFilter && (
          <label className="block">
            <span className="sr-only">{t('scheduleUi.instructor')}</span>
            <div className="relative">
              <FontAwesomeIcon icon={faChalkboardUser} className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
              <select
                value={filters.teacherId}
                onChange={(e) => set('teacherId', e.target.value)}
                className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 ps-9 pe-3 py-2 text-sm appearance-none"
              >
                <option value="">{t('scheduleUi.allTeachers')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user?.name ?? t('scheduleUi.teacherFallback', { id: teacher.id })}
                  </option>
                ))}
              </select>
            </div>
          </label>
        )}

        {showStudentFilter && (
          <label className="block">
            <span className="sr-only">{t('common.students')}</span>
            <div className="relative">
              <FontAwesomeIcon icon={faUserGraduate} className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
              <select
                value={filters.studentId}
                onChange={(e) => set('studentId', e.target.value)}
                className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 ps-9 pe-3 py-2 text-sm appearance-none"
              >
                <option value="">{t('scheduleUi.allStudents')}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user?.name ?? s.full_name ?? t('scheduleUi.studentFallback', { id: s.id })}
                  </option>
                ))}
              </select>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
