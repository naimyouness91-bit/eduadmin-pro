import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { timetablesAPI } from '../../services/api';
import { PageHeader, Card, Select } from '../common/UI';
import EmploiDuTempsGrid from './EmploiDuTempsGrid';
import TimetablePrintBar from './TimetablePrintBar';

export default function TimetableParentView() {
  const { t } = useTranslation();
  const [children, setChildren] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await timetablesAPI.mine();
      const list = Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
      setChildren(list);
      setActiveIdx(0);
    } catch (err) {
      console.error('[EmploiDuTemps] parent load failed', err);
      toast.error(t('timetable.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const active = children[activeIdx];
  const studentName = active?.student?.user?.name ?? '';
  const sectionLabel = active?.class_section?.label ?? '';

  return (
    <div className="space-y-4">
      <PageHeader title={t('timetable.title')} subtitle={t('timetable.parentSubtitle')} />

      {children.length > 1 && (
        <Select
          value={String(activeIdx)}
          onChange={(e) => setActiveIdx(Number(e.target.value))}
          className="max-w-xs"
        >
          {children.map((c, i) => (
            <option key={i} value={i}>
              {c.student?.user?.name ?? `Child ${i + 1}`}
            </option>
          ))}
        </Select>
      )}

      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold">{studentName}</p>
            <p className="text-xs text-surface-500">{sectionLabel}</p>
          </div>
          <TimetablePrintBar timetableId={active?.timetable?.id} label={sectionLabel} />
        </div>
        <EmploiDuTempsGrid
          cells={active?.cells ?? {}}
          periods={active?.periods}
          days={active?.days}
          loading={loading}
          readOnly
        />
      </Card>
    </div>
  );
}
