import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { parentAPI } from '../../services/api';
import useParentChildren from '../../hooks/useParentChildren';
import { PageHeader, Card, Table, Badge, Select, FormField, EmptyState } from '../common/UI';
import { formatDueDate, statusMeta } from '../assignments/assignmentUtils';

export default function ParentAssignmentsView() {
  const { t } = useTranslation();
  const { children, selectedId, setSelectedId, student, studentId, loading: childrenLoading } =
    useParentChildren();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!studentId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await parentAPI.childAssignments(studentId, { per_page: 100 });
      setAssignments(data.data ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message || t('assignments.loadFailed', { defaultValue: 'Failed to load assignments.' }));
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      key: 'title',
      label: t('assignments.columnTitle', { defaultValue: 'Title' }),
      render: (val, row) => (
        <div>
          <p className="font-medium">{val}</p>
          <p className="text-xs text-surface-500">{row.course?.name}</p>
        </div>
      ),
    },
    {
      key: 'due_date',
      label: t('assignments.columnDue', { defaultValue: 'Due date' }),
      render: (val) => formatDueDate(val),
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (val) => {
        const meta = statusMeta(val);
        return <Badge color={meta.color} size="xs">{meta.label}</Badge>;
      },
    },
  ];

  if (childrenLoading) {
    return <div className="h-48 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />;
  }

  if (!children.length) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title={t('assignments.title')} subtitle={t('assignments.parentSubtitle', { defaultValue: 'Homework for your child' })} />
        <Card>
          <p className="text-sm text-surface-500">{t('bulletin.noChildren')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in page-content-safe">
      <PageHeader
        title={t('assignments.title')}
        subtitle={t('assignments.parentSubtitle', {
          defaultValue: 'Homework for {{name}}',
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
        {assignments.length === 0 && !loading ? (
          <EmptyState title={t('assignments.empty', { defaultValue: 'No assignments' })} />
        ) : (
          <Table
            columns={columns}
            data={assignments}
            loading={loading}
            emptyMessage={t('assignments.empty', { defaultValue: 'No assignments' })}
          />
        )}
      </Card>
    </div>
  );
}
