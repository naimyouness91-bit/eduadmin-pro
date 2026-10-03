import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines } from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '../../store';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { parentAPI } from '../../services/api';
import AcademicBulletinPanel from '../../components/bulletins/AcademicBulletinPanel';
import { PageHeader, Card, Select, FormField } from '../../components/common/UI';
import { StudentPageShell } from '../../components/student/StudentUI';

export default function BulletinsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuthStore();
  const { studentId, studentCode, name, isStudent } = useStudentProfile();

  if (isStudent) {
    return (
      <StudentPageShell
        title={t('bulletin.pageTitle')}
        subtitle={t('bulletin.pageSubtitleStudent', { name })}
        icon={faFileLines}
      >
        {studentId ? (
          <AcademicBulletinPanel
            studentId={studentId}
            studentCode={studentCode}
            variant="viewer"
          />
        ) : (
          <Card>
            <p className="text-sm text-surface-500">{t('bulletin.profileMissing')}</p>
          </Card>
        )}
      </StudentPageShell>
    );
  }

  if (hasRole('parent')) {
    return <ParentBulletinsView />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t('bulletin.pageTitle')} subtitle={t('bulletin.adminOnlyHint')} />
      <Card>
        <p className="text-sm text-surface-500">
          {t('bulletin.adminNavigateHint')}{' '}
          <Link to="/students" className="text-primary-500 hover:underline font-medium">
            {t('nav.students')}
          </Link>
        </p>
      </Card>
    </div>
  );
}

function ParentBulletinsView() {
  const { t } = useTranslation();
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await parentAPI.children();
      const list = data.data ?? [];
      setChildren(list);
      if (list.length && !selectedId) {
        setSelectedId(String(list[0].student?.id ?? list[0].id));
      }
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const selected = children.find(
    (c) => String(c.student?.id ?? c.id) === String(selectedId)
  );
  const student = selected?.student ?? selected;
  const studentRecordId = student?.id;

  return (
    <div className="space-y-6 animate-fade-in page-content-safe">
      <PageHeader
        title={t('bulletin.pageTitle')}
        subtitle={t('bulletin.pageSubtitleParent')}
      />

      {loading ? (
        <div className="h-32 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
      ) : children.length === 0 ? (
        <Card>
          <p className="text-sm text-surface-500">{t('bulletin.noChildren')}</p>
        </Card>
      ) : (
        <>
          {children.length > 1 && (
            <Card className="max-w-md">
              <FormField label={t('bulletin.selectChild')}>
                <Select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
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

          {studentRecordId && (
            <AcademicBulletinPanel
              studentId={studentRecordId}
              studentCode={student?.student_id}
              variant="viewer"
            />
          )}
        </>
      )}
    </div>
  );
}
