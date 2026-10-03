export const DASHBOARD_LAYOUT_STORAGE_KEY = 'eduadmin-dashboard-layout-admin';

/** Default widget order for admin dashboard */
export const DEFAULT_ADMIN_WIDGET_ORDER = [
  'total_students',
  'total_teachers',
  'attendance',
  'grades',
  'activity_timeline',
  'notifications',
  'calendar',
];

/** Widgets grouped by dashboard row (for layout + same-row drag) */
export const ROW_WIDGETS = {
  kpi: ['total_students', 'total_teachers'],
  charts: ['attendance', 'grades'],
  activity: ['activity_timeline', 'notifications'],
  bottom: ['calendar'],
};

/** Layout metadata per widget */
export const ADMIN_WIDGET_META = {
  total_students: { row: 'kpi', slot: 'kpi', labelKey: 'dashboard.totalStudents' },
  total_teachers: { row: 'kpi', slot: 'kpi', labelKey: 'dashboard.teachers' },
  attendance: { row: 'charts', slot: 'wide', labelKey: 'dashboard.attendanceTrend' },
  grades: { row: 'charts', slot: 'narrow', labelKey: 'dashboard.gradeDistribution' },
  activity_timeline: { row: 'activity', slot: 'wide', labelKey: 'dashboard.recentActivity' },
  notifications: { row: 'activity', slot: 'narrow', labelKey: 'dashboard.notifications' },
  calendar: { row: 'bottom', slot: 'narrow', labelKey: 'dashboard.upcomingEvents' },
};

/** Column span for widget slot type inside a 12-column row */
export function getSlotColClass(slot) {
  switch (slot) {
    case 'wide':
      return 'col-span-1 lg:col-span-8';
    case 'narrow':
      return 'col-span-1 lg:col-span-4';
    case 'kpi':
    default:
      return 'col-span-1';
  }
}

/** Widgets for a row, sorted by saved global order */
export function orderForRow(order, rowKey) {
  const ids = ROW_WIDGETS[rowKey] ?? [];
  return ids
    .filter((id) => order.includes(id))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function normalizeWidgetOrder(order, defaultOrder = DEFAULT_ADMIN_WIDGET_ORDER) {
  const valid = new Set(defaultOrder);
  const seen = new Set();
  const normalized = [];

  (Array.isArray(order) ? order : []).forEach((id) => {
    if (valid.has(id) && !seen.has(id)) {
      normalized.push(id);
      seen.add(id);
    }
  });

  defaultOrder.forEach((id) => {
    if (!seen.has(id)) normalized.push(id);
  });

  return normalized;
}

export function readStoredWidgetOrder(
  storageKey = DASHBOARD_LAYOUT_STORAGE_KEY,
  defaultOrder = DEFAULT_ADMIN_WIDGET_ORDER
) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return normalizeWidgetOrder(JSON.parse(raw), defaultOrder);
    }
  } catch {
    /* ignore */
  }
  return [...defaultOrder];
}

export function persistWidgetOrder(
  order,
  storageKey = DASHBOARD_LAYOUT_STORAGE_KEY,
  defaultOrder = DEFAULT_ADMIN_WIDGET_ORDER
) {
  const normalized = normalizeWidgetOrder(order, defaultOrder);
  try {
    localStorage.setItem(storageKey, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
  return normalized;
}

/** Rebuild global order after a within-row drag */
export function mergeRowOrder(globalOrder, rowKey, newRowOrder) {
  const rowIds = new Set(ROW_WIDGETS[rowKey] ?? []);
  const withoutRow = globalOrder.filter((id) => !rowIds.has(id));
  const firstRowIndex = globalOrder.findIndex((id) => rowIds.has(id));
  if (firstRowIndex === -1) return normalizeWidgetOrder([...withoutRow, ...newRowOrder]);

  return normalizeWidgetOrder([
    ...globalOrder.slice(0, firstRowIndex),
    ...newRowOrder,
    ...globalOrder.slice(firstRowIndex).filter((id) => !rowIds.has(id)),
  ]);
}
