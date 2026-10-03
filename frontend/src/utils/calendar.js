export const EVENT_TYPES = [
  { value: 'exam', label: 'Exam', color: '#ef4444' },
  { value: 'meeting', label: 'Meeting', color: '#6366f1' },
  { value: 'holiday', label: 'Holiday', color: '#22c55e' },
  { value: 'event', label: 'Event', color: '#f59e0b' },
];

export const TYPE_COLORS = {
  exam: 'bg-danger-500',
  meeting: 'bg-primary-500',
  holiday: 'bg-success-500',
  event: 'bg-warning-500',
};

export const TYPE_BADGE_COLORS = {
  exam: 'bg-danger-500/15 text-danger-600 dark:text-danger-400 border-danger-500/30',
  meeting: 'bg-primary-500/15 text-primary-600 dark:text-primary-400 border-primary-500/30',
  holiday: 'bg-success-500/15 text-success-600 dark:text-success-400 border-success-500/30',
  event: 'bg-warning-500/15 text-warning-600 dark:text-warning-400 border-warning-500/30',
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function colorForType(type) {
  return EVENT_TYPES.find((t) => t.value === type)?.color ?? '#6366f1';
}

export function toDateParam(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeekMonday(date) {
  const end = startOfWeekMonday(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getFetchRange(view, cursor) {
  if (view === 'week') {
    return {
      from: toDateParam(startOfWeekMonday(cursor)),
      to: toDateParam(endOfWeekMonday(cursor)),
    };
  }
  const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  return { from: toDateParam(from), to: toDateParam(to) };
}

export function navigateCursor(cursor, view, direction) {
  const d = new Date(cursor);
  if (view === 'week') {
    d.setDate(d.getDate() + direction * 7);
    return d;
  }
  return new Date(d.getFullYear(), d.getMonth() + direction, 1);
}

export function eventOnDay(event, date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const start = new Date(event.start_date);
  const end = new Date(event.end_date || event.start_date);
  return start <= dayEnd && end >= dayStart;
}

export function buildMonthGrid(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  let startPad = first.getDay() - 1;
  if (startPad < 0) startPad = 6;
  const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= total; d++) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }
  return cells;
}

export function getWeekDays(cursor) {
  const start = startOfWeekMonday(cursor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function formatPeriodLabel(view, cursor) {
  if (view === 'week') {
    const days = getWeekDays(cursor);
    const opts = { month: 'short', day: 'numeric' };
    const y = days[0].getFullYear();
    if (days[0].getMonth() === days[6].getMonth()) {
      return `${days[0].toLocaleDateString('en-US', { month: 'long' })} ${days[0].getDate()}–${days[6].getDate()}, ${y}`;
    }
    return `${days[0].toLocaleDateString('en-US', opts)} – ${days[6].toLocaleDateString('en-US', opts)}, ${y}`;
  }
  return cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}
