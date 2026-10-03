/** Emploi du Temps — school week Mon–Sat with standard hourly periods. */

export const SCHOOL_WEEK_DAYS = [
  { value: 1, key: 'monday', short: 'Mon', label: 'Monday', labelFr: 'Lundi' },
  { value: 2, key: 'tuesday', short: 'Tue', label: 'Tuesday', labelFr: 'Mardi' },
  { value: 3, key: 'wednesday', short: 'Wed', label: 'Wednesday', labelFr: 'Mercredi' },
  { value: 4, key: 'thursday', short: 'Thu', label: 'Thursday', labelFr: 'Jeudi' },
  { value: 5, key: 'friday', short: 'Fri', label: 'Friday', labelFr: 'Vendredi' },
  { value: 6, key: 'saturday', short: 'Sat', label: 'Saturday', labelFr: 'Samedi' },
];

export const TIMETABLE_DAYS = SCHOOL_WEEK_DAYS;
export const DEFAULT_WEEK_DAYS = SCHOOL_WEEK_DAYS.filter((d) => d.value <= 5);

export const TIMETABLE_PERIODS = [
  { start: '08:00', end: '10:00', label: '08:00 – 10:00', band: 'morning' },
  { start: '10:00', end: '12:00', label: '10:00 – 12:00', band: 'morning' },
  { start: '14:00', end: '16:00', label: '14:00 – 16:00', band: 'afternoon' },
  { start: '16:00', end: '18:00', label: '16:00 – 18:00', band: 'afternoon' },
];

export function cellKey(day, start) {
  return `${day}|${String(start).slice(0, 5)}`;
}

export function formatTimeRange(start, end) {
  const s = String(start ?? '').slice(0, 5);
  const e = String(end ?? '').slice(0, 5);
  return s && e ? `${s} – ${e}` : s || e || '';
}

export function dayLabel(day, isFr = false) {
  const found = SCHOOL_WEEK_DAYS.find((d) => d.value === day);
  if (!found) return String(day);
  return isFr ? found.labelFr : found.label;
}

export function groupSessionsByDay(sessionsByDay = {}, days = SCHOOL_WEEK_DAYS) {
  return days.map((day) => ({
    ...day,
    sessions: (sessionsByDay[day.value] ?? []).sort((a, b) =>
      String(a.start_time).localeCompare(String(b.start_time))
    ),
  }));
}

/** Map conflict entry IDs to grid cell keys. */
export function conflictKeysFromGrid(conflicts = [], cells = {}) {
  const keys = new Set();
  const entryToKey = {};
  Object.entries(cells).forEach(([key, cell]) => {
    if (cell?.id) entryToKey[cell.id] = key;
  });
  conflicts.forEach((c) => {
    if (c.entry_a_id && entryToKey[c.entry_a_id]) keys.add(entryToKey[c.entry_a_id]);
    if (c.entry_b_id && entryToKey[c.entry_b_id]) keys.add(entryToKey[c.entry_b_id]);
  });
  return keys;
}

export function conflictEntryIds(conflicts = []) {
  const ids = new Set();
  conflicts.forEach((c) => {
    if (c.entry_a_id) ids.add(c.entry_a_id);
    if (c.entry_b_id) ids.add(c.entry_b_id);
  });
  return ids;
}
