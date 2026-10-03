export function downloadAnalyticsCsv({ kpis, insights, year, monthFrom, monthTo }) {
  const rows = [
    ['EduAdmin Pro — Analytics Report'],
    ['Generated', new Date().toISOString()],
    ['Year', year],
    ['Month range', `${monthFrom}–${monthTo}`],
    [],
    ['KPI', 'Value'],
    ...Object.entries(kpis || {}).map(([k, v]) => [k, v ?? '']),
    [],
    ['Insight', 'Name', 'Value', 'Meta'],
    ...Object.entries(insights || {})
      .filter(([, v]) => v)
      .map(([k, v]) => [k, v.name, v.value, v.meta ?? '']),
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics-report-${year}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function printAnalyticsReport() {
  window.print();
}
