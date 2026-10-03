import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { schedulesAPI, coursesAPI, teachersAPI, studentsAPI } from '../services/api';
import {
  detectConflicts,
  filterSchedules,
  getWeeklyTeachingHours,
  groupByDay,
} from '../utils/scheduleUtils';

export function useScheduleData({ canFilterStudents = false, canFilterTeachers = false } = {}) {
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentCourseIds, setStudentCourseIds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    courseId: '',
    teacherId: '',
    studentId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { active_only: true };
      if (filters.courseId) params.course_id = filters.courseId;

      const requests = [schedulesAPI.list(params)];
      if (canFilterTeachers) requests.push(teachersAPI.list({ per_page: 100 }));
      if (canFilterStudents) requests.push(studentsAPI.list({ per_page: 100 }));
      requests.push(coursesAPI.list({ per_page: 100 }));

      const results = await Promise.all(requests);
      setSchedules(results[0].data.data ?? []);

      let idx = 1;
      if (canFilterTeachers) {
        setTeachers(results[idx].data.data ?? []);
        idx += 1;
      }
      if (canFilterStudents) {
        setStudents(results[idx].data.data ?? []);
        idx += 1;
      }
      setCourses(results[idx].data.data ?? []);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [filters.courseId, canFilterTeachers, canFilterStudents]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!filters.studentId) {
      setStudentCourseIds(null);
      return undefined;
    }

    let cancelled = false;
    studentsAPI.get(filters.studentId).then((res) => {
      if (cancelled) return;
      const student = res.data.data ?? res.data;
      const ids = student?.courses?.map((c) => c.id) ?? [];
      setStudentCourseIds(ids);
    }).catch(() => setStudentCourseIds([]));

    return () => { cancelled = true; };
  }, [filters.studentId]);

  const filteredSchedules = useMemo(
    () =>
      filterSchedules(schedules, {
        search: filters.search,
        courseId: filters.courseId,
        teacherId: filters.teacherId,
        studentCourseIds: filters.studentId ? (studentCourseIds ?? []) : null,
      }),
    [schedules, filters, studentCourseIds]
  );

  const byDay = useMemo(() => groupByDay(filteredSchedules), [filteredSchedules]);
  const conflicts = useMemo(() => detectConflicts(filteredSchedules), [filteredSchedules]);
  const teachingHours = useMemo(() => getWeeklyTeachingHours(filteredSchedules), [filteredSchedules]);

  const conflictSlotIds = useMemo(() => {
    const ids = new Set();
    conflicts.forEach((c) => c.slots.forEach((s) => ids.add(s.id)));
    return ids;
  }, [conflicts]);

  return {
    schedules,
    filteredSchedules,
    byDay,
    conflicts,
    conflictSlotIds,
    teachingHours,
    courses,
    teachers,
    students,
    loading,
    filters,
    setFilters,
    reload: load,
  };
}
