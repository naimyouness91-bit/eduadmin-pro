import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { timetablesAPI } from '../../services/api';
import { Button } from '../common/UI';

export default function TimetablePrintBar({ timetableId, label }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      if (err?.message === 'POPUP_BLOCKED') {
        toast.error(t('timetable.popupBlocked'));
      } else {
        toast.error(t('timetable.exportError'));
      }
    } finally {
      setBusy(null);
    }
  };

  if (!timetableId) return null;

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        icon={faPrint}
        loading={busy === 'print'}
        disabled={!!busy}
        onClick={() => run('print', () => timetablesAPI.printHtml(timetableId))}
      >
        {t('timetable.print')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        icon={faFilePdf}
        loading={busy === 'pdf'}
        disabled={!!busy}
        onClick={() => run('pdf', () => timetablesAPI.exportPdf(timetableId, label))}
      >
        {t('timetable.exportPdf')}
      </Button>
    </div>
  );
}
