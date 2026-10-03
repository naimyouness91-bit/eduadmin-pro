/** Convert timetable grid cells to legacy schedule-slot shape for dashboard widgets. */
export function cellsToScheduleSlots(cells = {}) {
  if (!cells || typeof cells !== 'object') return [];

  return Object.values(cells).map((cell) => ({
    id: cell.id ?? `${cell.day_of_week}-${cell.start_time}`,
    day_of_week: cell.day_of_week,
    start_time: cell.start_time,
    end_time: cell.end_time,
    room: cell.room,
    course: cell.course,
    teacher: cell.teacher,
  }));
}
