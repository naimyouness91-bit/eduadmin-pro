function escapeCsv(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportStudentsCsv(students, filename = 'students-export.csv') {
  const headers = ['Name', 'Email', 'Student ID', 'Grade', 'Section', 'Status', 'Enrolled'];
  const rows = students.map((s) => [
    s.user?.name,
    s.user?.email,
    s.student_id,
    s.grade_level,
    s.section,
    s.enrollment_status,
    s.enrollment_date,
  ]);

  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseStudentsCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  return lines.slice(1).map((line) => {
    const cols = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) =>
      c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
    ) ?? [];

    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });

    return {
      name: row.name || row['full name'] || '',
      email: row.email || '',
      student_id: row['student id'] || row.student_id || row.id || '',
      grade_level: row.grade || row.grade_level || row['grade level'] || '',
      section: row.section || '',
      enrollment_status: row.status || row.enrollment_status || 'active',
      password: row.password || 'password123',
    };
  }).filter((r) => r.name && r.email);
}
