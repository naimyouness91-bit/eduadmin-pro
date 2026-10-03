import { useAuthStore } from '../../store';
import TimetableAdminManager from '../../components/timetable/TimetableAdminManager';
import TimetableTeacherView from '../../components/timetable/TimetableTeacherView';
import TimetableStudentView from '../../components/timetable/TimetableStudentView';
import TimetableParentView from '../../components/timetable/TimetableParentView';

/**
 * Emploi du Temps — class schedules distributed automatically to students, teachers, and parents.
 */
export default function Schedule() {
  const { hasRole } = useAuthStore();

  if (hasRole('student')) {
    return <TimetableStudentView />;
  }

  if (hasRole('teacher')) {
    return <TimetableTeacherView />;
  }

  if (hasRole('parent')) {
    return <TimetableParentView />;
  }

  return <TimetableAdminManager />;
}
