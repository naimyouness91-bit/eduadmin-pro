export const SUBMISSION_STATUS = {
  pending: { label: 'Pending', color: 'warning' },
  submitted: { label: 'Submitted', color: 'success' },
  late: { label: 'Late', color: 'danger' },
  reviewed: { label: 'Reviewed', color: 'primary' },
};

export function formatDueDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function isPastDue(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export function statusMeta(status) {
  return SUBMISSION_STATUS[status] || SUBMISSION_STATUS.pending;
}
