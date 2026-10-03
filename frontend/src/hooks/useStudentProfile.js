import { useMemo } from 'react';
import { useAuthStore } from '../store';

export function useStudentProfile() {
  const { user } = useAuthStore();

  return useMemo(() => {
    const student = user?.student;
    const studentId = student?.id ?? null;
    return {
      user,
      student,
      studentId,
      isStudent: user?.role === 'student',
      name: user?.name ?? 'Student',
      gradeLevel: student?.grade_level ?? '',
      section: student?.section ?? '',
      studentCode: student?.student_id ?? '',
    };
  }, [user]);
}
