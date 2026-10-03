export const SCHEDULE_DAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 7, label: 'Sunday', short: 'Sun' },
];

export const SUBJECT_PALETTES = [
  { bg: 'bg-primary-500/15', border: 'border-primary-500/30', text: 'text-primary-800 dark:text-primary-200', accent: 'bg-primary-500', dot: 'bg-primary-500' },
  { bg: 'bg-success-500/15', border: 'border-success-500/30', text: 'text-success-800 dark:text-success-200', accent: 'bg-success-500', dot: 'bg-success-500' },
  { bg: 'bg-warning-500/15', border: 'border-warning-500/30', text: 'text-warning-800 dark:text-warning-200', accent: 'bg-warning-500', dot: 'bg-warning-500' },
  { bg: 'bg-info-500/15', border: 'border-info-500/30', text: 'text-info-800 dark:text-info-200', accent: 'bg-info-500', dot: 'bg-info-500' },
  { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-800 dark:text-purple-200', accent: 'bg-purple-500', dot: 'bg-purple-500' },
  { bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-800 dark:text-rose-200', accent: 'bg-rose-500', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-800 dark:text-cyan-200', accent: 'bg-cyan-500', dot: 'bg-cyan-500' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-800 dark:text-amber-200', accent: 'bg-amber-500', dot: 'bg-amber-500' },
];

export const GRID_HOUR_START = 7;
export const GRID_HOUR_END = 19;
export const GRID_SLOT_HEIGHT = 56;

export function todayIsoDay() {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export function formatScheduleTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function getDurationMinutes(start, end) {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

export function formatDuration(start, end) {
  const mins = getDurationMinutes(start, end);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function paletteForCourse(courseId) {
  return SUBJECT_PALETTES[Math.abs(Number(courseId) || 0) % SUBJECT_PALETTES.length];
}

export function getTeacherName(slot) {
  return slot.teacher?.user?.name ?? slot.course?.teacher?.user?.name ?? 'Staff';
}

export function getRoom(slot) {
  return slot.room || slot.course?.room || 'TBA';
}

export function groupByDay(schedules) {
  const map = Object.fromEntries(SCHEDULE_DAYS.map((d) => [d.value, []]));
  schedules.forEach((slot) => {
    if (map[slot.day_of_week]) map[slot.day_of_week].push(slot);
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))
  ));
  return map;
}

export function timesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function detectConflicts(schedules) {
  const conflicts = [];
  for (let i = 0; i < schedules.length; i += 1) {
    for (let j = i + 1; j < schedules.length; j += 1) {
      const a = schedules[i];
      const b = schedules[j];
      if (a.day_of_week !== b.day_of_week) continue;

      const aStart = timeToMinutes(a.start_time);
      const aEnd = timeToMinutes(a.end_time);
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);
      if (!timesOverlap(aStart, aEnd, bStart, bEnd)) continue;

      const roomA = getRoom(a);
      const roomB = getRoom(b);
      if (roomA !== 'TBA' && roomB !== 'TBA' && roomA === roomB) {
        conflicts.push({
          id: `room-${a.id}-${b.id}`,
          type: 'room',
          slots: [a, b],
          message: `${roomA} is double-booked on ${SCHEDULE_DAYS.find((d) => d.value === a.day_of_week)?.label}`,
        });
      }

      const teacherA = a.teacher_id ?? a.course?.teacher_id;
      const teacherB = b.teacher_id ?? b.course?.teacher_id;
      if (teacherA && teacherB && Number(teacherA) === Number(teacherB)) {
        conflicts.push({
          id: `teacher-${a.id}-${b.id}`,
          type: 'teacher',
          slots: [a, b],
          message: `${getTeacherName(a)} has overlapping classes`,
        });
      }
    }
  }
  return conflicts;
}

export function filterSchedules(schedules, { search, courseId, teacherId, studentCourseIds } = {}) {
  let result = [...schedules];

  if (courseId) {
    result = result.filter((s) => String(s.course_id) === String(courseId));
  }

  if (teacherId) {
    result = result.filter((s) => {
      const tid = s.teacher_id ?? s.course?.teacher_id;
      return String(tid) === String(teacherId);
    });
  }

  if (studentCourseIds?.length) {
    const set = new Set(studentCourseIds.map(String));
    result = result.filter((s) => set.has(String(s.course_id)));
  }

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((s) => {
      const haystack = [
        s.course?.name,
        s.course?.code,
        getTeacherName(s),
        getRoom(s),
        SCHEDULE_DAYS.find((d) => d.value === s.day_of_week)?.label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return result;
}

export function getTodaySlots(schedules) {
  const today = todayIsoDay();
  return schedules
    .filter((s) => s.day_of_week === today)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
}

export function getUpcomingSlots(schedules, limit = 5) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const today = todayIsoDay();

  const upcoming = [];

  schedules.forEach((slot) => {
    if (slot.day_of_week === today && timeToMinutes(slot.start_time) >= nowMins) {
      upcoming.push({ ...slot, _sortKey: slot.day_of_week * 1440 + timeToMinutes(slot.start_time) });
    } else if (slot.day_of_week > today) {
      upcoming.push({ ...slot, _sortKey: slot.day_of_week * 1440 + timeToMinutes(slot.start_time) });
    } else if (slot.day_of_week < today) {
      upcoming.push({ ...slot, _sortKey: (slot.day_of_week + 7) * 1440 + timeToMinutes(slot.start_time) });
    }
  });

  return upcoming.sort((a, b) => a._sortKey - b._sortKey).slice(0, limit);
}

export function getNextSession(schedules) {
  return getUpcomingSlots(schedules, 1)[0] ?? null;
}

export function getWeeklyTeachingHours(schedules) {
  const totalMins = schedules.reduce((sum, s) => sum + getDurationMinutes(s.start_time, s.end_time), 0);
  return (totalMins / 60).toFixed(1);
}

export function getWeeklySummary(schedules) {
  const byDay = groupByDay(schedules);
  return SCHEDULE_DAYS.map((day) => ({
    ...day,
    count: byDay[day.value]?.length ?? 0,
    minutes: (byDay[day.value] ?? []).reduce(
      (sum, s) => sum + getDurationMinutes(s.start_time, s.end_time),
      0
    ),
  }));
}

export function getMonthCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days = [];

  for (let i = startPad; i > 0; i -= 1) {
    const d = new Date(year, month, 1 - i);
    days.push({ date: d, inMonth: false, isoDay: d.getDay() === 0 ? 7 : d.getDay() });
  }

  for (let d = 1; d <= last.getDate(); d += 1) {
    const date = new Date(year, month, d);
    days.push({ date, inMonth: true, isoDay: date.getDay() === 0 ? 7 : date.getDay() });
  }

  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - last.getDate() - startPad + 1);
    days.push({ date: d, inMonth: false, isoDay: d.getDay() === 0 ? 7 : d.getDay() });
  }

  return days;
}

export function gridPosition(startTime, endTime) {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const gridStart = GRID_HOUR_START * 60;
  const top = ((startMins - gridStart) / 60) * GRID_SLOT_HEIGHT;
  const height = Math.max(((endMins - startMins) / 60) * GRID_SLOT_HEIGHT - 4, 48);
  return { top: Math.max(top, 0), height };
}

export function buildGridHours() {
  const hours = [];
  for (let h = GRID_HOUR_START; h <= GRID_HOUR_END; h += 1) {
    hours.push(`${String(h).padStart(2, '0')}:00`);
  }
  return hours;
}
