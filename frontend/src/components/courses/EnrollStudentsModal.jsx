import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { coursesAPI, studentsAPI } from '../../services/api';
import { Modal, SearchBar, Button, Avatar } from '../common/UI';

export default function EnrollStudentsModal({
  isOpen,
  onClose,
  courseId,
  enrolledIds = [],
  onSuccess,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelected([]);
    setLoading(true);
    studentsAPI
      .list({ per_page: 100, enrollment_status: 'active' })
      .then((res) => setStudents(res.data.data ?? []))
      .catch(() => toast.error(t('courses.enrollLoadFailed')))
      .finally(() => setLoading(false));
  }, [isOpen, t]);

  const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => !enrolledSet.has(s.id))
      .filter((s) => {
        if (!q) return true;
        const name = s.user?.name?.toLowerCase() ?? '';
        const email = s.user?.email?.toLowerCase() ?? '';
        const sid = s.student_id?.toLowerCase() ?? '';
        return name.includes(q) || email.includes(q) || sid.includes(q);
      });
  }, [students, enrolledSet, search]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleEnroll = async () => {
    if (!selected.length) {
      toast.error(t('courses.enrollSelectOne'));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await coursesAPI.enroll(courseId, { student_ids: selected });
      toast.success(data.message || t('courses.enrollSuccess'));
      onSuccess?.(data.data);
      onClose();
    } catch {
      toast.error(t('courses.enrollFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('courses.enrollModalTitle')}
      size="md"
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-sm text-surface-500">{t('courses.enrollSelected', { count: selected.length })}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>{t('common.cancel')}</Button>
            <Button onClick={handleEnroll} loading={submitting} disabled={!selected.length}>
              {t('courses.enrollButton')}
            </Button>
          </div>
        </div>
      }
    >
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('courses.enrollSearchPlaceholder')}
        className="mb-4"
      />
      <div className="max-h-72 overflow-y-auto space-y-1">
        {loading ? (
          <p className="text-sm text-surface-400 text-center py-8">{t('common.loading')}</p>
        ) : available.length ? (
          available.map((student) => (
            <label
              key={student.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(student.id)}
                onChange={() => toggle(student.id)}
                className="rounded border-surface-300 text-primary-500 focus:ring-primary-500/30"
              />
              <Avatar src={student.user?.avatar_url} name={student.user?.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                  {student.user?.name}
                </p>
                <p className="text-xs font-mono text-surface-400">{student.student_id}</p>
              </div>
            </label>
          ))
        ) : (
          <p className="text-sm text-surface-400 text-center py-8">
            {search ? t('courses.enrollNoMatch') : t('courses.enrollAllEnrolled')}
          </p>
        )}
      </div>
    </Modal>
  );
}
