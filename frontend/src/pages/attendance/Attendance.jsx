import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { attendanceAPI, coursesAPI, parentAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import useParentChildren from '../../hooks/useParentChildren';
import StudentAttendance from '../student/StudentAttendance';
import {
  PageHeader,
  Card,
  Select,
  Tabs,
  Avatar,
  Button,
  Table,
  Badge,
  ProgressBar,
  FormField,
} from '../../components/common/UI';
import QrModal from '../../components/attendance/QrModal';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLES = {
  present: {
    card: 'border-success-500/30 bg-success-500/5',
    btn: 'bg-success-500 text-white',
    btnIdle: 'hover:bg-success-500/20 text-success-600 dark:text-success-400',
  },
  absent: {
    card: 'border-danger-500/30 bg-danger-500/5',
    btn: 'bg-danger-500 text-white',
    btnIdle: 'hover:bg-danger-500/20 text-danger-600 dark:text-danger-400',
  },
  late: {
    card: 'border-warning-500/30 bg-warning-500/5',
    btn: 'bg-warning-500 text-white',
    btnIdle: 'hover:bg-warning-500/20 text-warning-600 dark:text-warning-400',
  },
  excused: {
    card: 'border-info-500/30 bg-info-500/5',
    btn: 'bg-info-500 text-white',
    btnIdle: 'hover:bg-info-500/20 text-info-600 dark:text-info-400',
  },
};

export default function Attendance() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentAttendance />;
  if (hasRole('parent')) return <ParentAttendance />;
  return <AttendanceAdmin />;
}

function AttendanceAdmin() {
  const { t } = useTranslation();
  const [mode, setMode] = useState('manual');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [qrData, setQrData] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);

  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [reportTo, setReportTo] = useState(today());
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    coursesAPI.list({ per_page: 100 }).then((res) => setCourses(res.data.data ?? [])).catch(() => {});
  }, []);

  const loadCourseData = useCallback(async () => {
    if (!selectedCourse) {
      setStudents([]);
      setAttendance({});
      return;
    }
    setLoadingStudents(true);
    try {
      const [courseRes, attRes] = await Promise.all([
        coursesAPI.get(selectedCourse),
        attendanceAPI.list({
          course_id: selectedCourse,
          date: selectedDate,
          per_page: 100,
        }),
      ]);
      const enrolled = courseRes.data.data?.students ?? [];
      setStudents(enrolled);
      const map = {};
      enrolled.forEach((s) => {
        map[s.id] = 'present';
      });
      (attRes.data.data ?? []).forEach((row) => {
        map[row.student_id] = row.status;
      });
      setAttendance(map);
    } catch {
      toast.error(t('attendancePage.loadStudentsFailed'));
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedCourse, selectedDate, t]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  const presencePct = useMemo(() => {
    if (!students.length) return 0;
    const present = students.filter((s) => attendance[s.id] === 'present').length;
    return Math.round((present / students.length) * 100);
  }, [students, attendance]);

  const markedCount = useMemo(
    () => Object.keys(attendance).filter((id) => attendance[id]).length,
    [attendance]
  );

  const handleSingleMark = async (studentId, status) => {
    if (!selectedCourse) return;
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
    try {
      await attendanceAPI.mark({
        course_id: Number(selectedCourse),
        student_id: studentId,
        date: selectedDate,
        status,
        method: 'manual',
      });
      toast.success(t('attendancePage.saved'));
    } catch {
      toast.error(t('attendancePage.markFailed'));
      loadCourseData();
    }
  };

  const handleBulkSave = async () => {
    if (!selectedCourse || !markedCount) return;
    setSaving(true);
    try {
      await attendanceAPI.bulk({
        course_id: Number(selectedCourse),
        date: selectedDate,
        attendance: Object.entries(attendance).map(([student_id, status]) => ({
          student_id: Number(student_id),
          status,
        })),
      });
      toast.success(t('attendancePage.bulkSaved'));
    } catch {
      toast.error(t('attendancePage.bulkSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status) => {
    const next = {};
    students.forEach((s) => {
      next[s.id] = status;
    });
    setAttendance(next);
  };

  const handleGenerateQr = async () => {
    if (!selectedCourse) {
      toast.error(t('attendancePage.selectCourseFirst'));
      return;
    }
    setGeneratingQr(true);
    try {
      const { data } = await attendanceAPI.generateQr({
        course_id: Number(selectedCourse),
        date: selectedDate,
      });
      setQrData(data);
      setQrOpen(true);
    } catch {
      toast.error(t('attendancePage.qrFailed'));
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleLoadReport = async () => {
    if (!selectedCourse) {
      toast.error(t('attendancePage.selectCourseForReport'));
      return;
    }
    setLoadingReport(true);
    try {
      const { data } = await attendanceAPI.report({
        course_id: Number(selectedCourse),
        from: reportFrom,
        to: reportTo,
      });
      setReport(data);
    } catch {
      toast.error(t('attendancePage.loadReportFailed'));
    } finally {
      setLoadingReport(false);
    }
  };

  const tabs = useMemo(
    () => [
      { key: 'manual', label: t('attendancePage.tabManual') },
      { key: 'bulk', label: t('attendancePage.tabBulk') },
      { key: 'qr', label: t('attendancePage.tabQr') },
      { key: 'report', label: t('attendancePage.tabReport') },
    ],
    [t]
  );

  const BULK_MARK_ALL = useMemo(
    () => [
      { status: 'present', label: t('common.present'), color: 'bg-success-500 hover:bg-success-600 text-white' },
      { status: 'absent', label: t('common.absent'), color: 'bg-danger-500 hover:bg-danger-600 text-white' },
      { status: 'late', label: t('common.late'), color: 'bg-warning-500 hover:bg-warning-600 text-white' },
      { status: 'excused', label: t('common.excused'), color: 'bg-info-500 hover:bg-info-600 text-white' },
    ],
    [t]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('attendancePage.title')}
        subtitle={t('attendancePage.subtitle')}
      />

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-surface-500 mb-1.5">{t('attendancePage.course')}</label>
            <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="">{t('attendancePage.selectCourse')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-48">
            <label className="block text-xs font-medium text-surface-500 mb-1.5">{t('attendancePage.date')}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
        {selectedCourse && students.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-surface-500">{t('attendancePage.presentToday')}</span>
              <span className="font-semibold text-surface-900 dark:text-white">{presencePct}%</span>
            </div>
            <ProgressBar value={presencePct} color="success" size="md" />
          </div>
        )}
      </Card>

      <Tabs
        tabs={tabs}
        active={mode}
        onChange={(key) => {
          setMode(key);
        }}
      />

      {mode === 'manual' && (
        <div>
          {!selectedCourse ? (
            <p className="text-sm text-surface-400 text-center py-12">{t('attendancePage.selectCourseToMark')}</p>
          ) : loadingStudents ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {students.map((student) => {
                const status = attendance[student.id] || 'present';
                const style = STATUS_STYLES[status] || STATUS_STYLES.present;
                return (
                  <div
                    key={student.id}
                    className={`rounded-2xl border p-4 transition-colors ${style.card}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar src={student.user?.avatar_url} name={student.user?.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-surface-900 dark:text-white truncate">
                          {student.user?.name}
                        </p>
                        <p className="font-mono text-xs text-surface-400">{student.student_id}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['present', 'absent', 'late', 'excused'].map((st) => {
                        const stStyle = STATUS_STYLES[st];
                        const active = status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleSingleMark(student.id, st)}
                            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                              active ? stStyle.btn : stStyle.btnIdle
                            }`}
                          >
                            {st === 'present' ? 'P' : st === 'absent' ? 'A' : st === 'late' ? 'L' : 'E'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'bulk' && (
        <Card padding={false}>
          {!selectedCourse ? (
            <p className="text-sm text-surface-400 text-center py-12 p-6">{t('attendancePage.selectCourse')}</p>
          ) : (
            <>
              <div className="p-4 flex flex-wrap gap-2 border-b border-surface-100 dark:border-surface-800">
                <span className="text-sm text-surface-500 w-full sm:w-auto sm:mr-2 self-center">
                  {t('attendancePage.markAllAs')}
                </span>
                {BULK_MARK_ALL.map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => markAll(item.status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${item.color}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Table
                columns={[
                  {
                    key: 'student',
                    label: t('common.students'),
                    render: (_, row) => (
                      <div className="flex items-center gap-3">
                        <Avatar src={row.user?.avatar_url} name={row.user?.name} size="sm" />
                        <span className="font-medium">{row.user?.name}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'student_id',
                    label: t('common.id'),
                    render: (val) => <span className="font-mono text-xs">{val}</span>,
                  },
                  {
                    key: 'status',
                    label: t('common.status'),
                    render: (_, row) => (
                      <Select
                        value={attendance[row.id] || 'present'}
                        onChange={(e) =>
                          setAttendance((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        className="w-36"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="present">{t('common.present')}</option>
                        <option value="absent">{t('common.absent')}</option>
                        <option value="late">{t('common.late')}</option>
                        <option value="excused">{t('common.excused')}</option>
                      </Select>
                    ),
                  },
                ]}
                data={students}
                loading={loadingStudents}
                emptyMessage={t('attendancePage.noStudentsEnrolled')}
              />
              <div className="p-4 border-t border-surface-100 dark:border-surface-800">
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleBulkSave}
                  loading={saving}
                  disabled={!markedCount}
                >
                  {t('attendancePage.saveAttendance', { count: markedCount })}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {mode === 'qr' && (
        <Card>
          <div className="flex flex-col items-center py-12">
            <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-surface-300 dark:border-surface-600 flex items-center justify-center mb-6">
              <FontAwesomeIcon icon={faQrcode} className="w-16 h-16 text-surface-300 dark:text-surface-600" />
            </div>
            <p className="text-sm text-surface-500 mb-6 text-center max-w-sm">
              {t('attendancePage.qrDescription')}
            </p>
            <Button onClick={handleGenerateQr} loading={generatingQr} disabled={!selectedCourse}>
              {t('attendancePage.generateQr')}
            </Button>
          </div>
        </Card>
      )}

      {mode === 'report' && (
        <Card padding={false}>
          <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-surface-100 dark:border-surface-800">
            <div>
              <label className="block text-xs text-surface-500 mb-1">{t('attendancePage.from')}</label>
              <input
                type="date"
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
                className="bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">{t('attendancePage.to')}</label>
              <input
                type="date"
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
                className="bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleLoadReport} loading={loadingReport} disabled={!selectedCourse}>
                {t('attendancePage.loadReport')}
              </Button>
            </div>
          </div>
          {report?.by_student?.length ? (
            <Table
              columns={[
                {
                  key: 'student',
                  label: t('common.students'),
                  render: (_, row) => row.student?.user?.name || '—',
                },
                { key: 'total', label: t('students.statsTotal') },
                {
                  key: 'present',
                  label: t('common.present'),
                  render: (val) => <Badge color="success" size="xs">{val}</Badge>,
                },
                {
                  key: 'absent',
                  label: t('common.absent'),
                  render: (val) => <Badge color="danger" size="xs">{val}</Badge>,
                },
                {
                  key: 'late',
                  label: t('common.late'),
                  render: (val) => <Badge color="warning" size="xs">{val}</Badge>,
                },
                {
                  key: 'rate',
                  label: t('attendancePage.rate'),
                  render: (val) => (
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className="flex-1">
                        <ProgressBar value={val} color="success" size="sm" />
                      </div>
                      <span className="text-xs font-medium w-10">{val}%</span>
                    </div>
                  ),
                },
              ]}
              data={report.by_student}
            />
          ) : (
            <p className="text-sm text-surface-400 text-center py-12">
              {report ? t('attendancePage.noReportData') : t('attendancePage.loadReportPrompt')}
            </p>
          )}
        </Card>
      )}

      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} qrData={qrData} />
    </div>
  );
}

function ParentAttendance() {
  const { t } = useTranslation();
  const { children, selectedId, setSelectedId, student, studentId, loading: childrenLoading } =
    useParentChildren();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    parentAPI
      .childAttendance(studentId, { per_page: 100 })
      .then((res) => setRecords(res.data.data ?? []))
      .catch(() => toast.error(t('attendancePage.loadFailed')))
      .finally(() => setLoading(false));
  }, [studentId, t]);

  const columns = [
    {
      key: 'course',
      label: t('common.course'),
      render: (_, row) => row.course?.name || '—',
    },
    { key: 'date', label: t('common.date') },
    {
      key: 'status',
      label: t('common.status'),
      render: (val) => (
        <Badge
          color={val === 'present' ? 'success' : val === 'absent' ? 'danger' : 'warning'}
          size="xs"
        >
          {val}
        </Badge>
      ),
    },
  ];

  if (childrenLoading) {
    return <div className="h-48 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />;
  }

  if (!children.length) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title={t('attendancePage.title')} subtitle={t('attendancePage.parentSubtitle')} />
        <Card>
          <p className="text-sm text-surface-500">{t('bulletin.noChildren')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in page-content-safe">
      <PageHeader
        title={t('attendancePage.title')}
        subtitle={t('attendancePage.parentSubtitle', {
          name: student?.user?.name ?? '',
        })}
      />

      {children.length > 1 && (
        <Card className="max-w-md">
          <FormField label={t('bulletin.selectChild')}>
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {children.map((c) => {
                const s = c.student ?? c;
                return (
                  <option key={s.id} value={s.id}>
                    {s.user?.name ?? s.name} ({s.student_id})
                  </option>
                );
              })}
            </Select>
          </FormField>
        </Card>
      )}

      <Card padding={false}>
        <Table columns={columns} data={records} loading={loading} emptyMessage={t('attendancePage.noRecords')} />
      </Card>
    </div>
  );
}
