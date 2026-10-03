import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { timetablesAPI } from '../../services/api';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { PageHeader, Card } from '../common/UI';
import EmploiDuTempsGrid from './EmploiDuTempsGrid';
import TimetablePrintBar from './TimetablePrintBar';

export default function TimetableStudentView() {
  const { t } = useTranslation();
  const { name, gradeLevel, section } = useStudentProfile();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await timetablesAPI.mine();
      setData(res.data);
    } catch (err) {
      console.error('[EmploiDuTemps] student load failed', err);
      setData(null);
      if (err?.response?.status === 404) {
        toast.error(t('timetable.notFoundStudent'));
      } else {
        toast.error(t('timetable.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const sectionLabel =
    data?.class_section?.label ?? (gradeLevel && section ? `${gradeLevel} ${section}` : '');

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('timetable.title')}
        subtitle={t('timetable.studentSubtitle', { name, class: sectionLabel })}
      />

      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold text-surface-900 dark:text-white">{sectionLabel}</p>
            <p className="text-xs text-surface-500">{t('timetable.studentReadOnly')}</p>
          </div>
          <TimetablePrintBar timetableId={data?.timetable?.id} label={sectionLabel} />
        </div>
        <EmploiDuTempsGrid
          cells={data?.cells ?? {}}
          periods={data?.periods}
          days={data?.days}
          loading={loading}
          readOnly
        />
      </Card>
    </div>
  );
}
