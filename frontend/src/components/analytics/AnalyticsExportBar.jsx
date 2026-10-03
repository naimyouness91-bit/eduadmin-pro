import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileCsv, faFileExcel, faPrint } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../common/UI';
import { downloadAnalyticsCsv, printAnalyticsReport } from '../../utils/analyticsExport';

export default function AnalyticsExportBar({ kpis, insights, year, monthFrom, monthTo, onExportExcel }) {
  const { t } = useTranslation();

  const handleCsv = () => {
    downloadAnalyticsCsv({ kpis, insights, year, monthFrom, monthTo });
    toast.success(t('analytics.csvDownloaded'));
  };

  const handlePrint = () => {
    printAnalyticsReport();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" icon={faFileCsv} onClick={handleCsv}>
        {t('analytics.exportCsv')}
      </Button>
      <Button type="button" variant="outline" size="sm" icon={faFileExcel} onClick={onExportExcel}>
        {t('analytics.exportExcel')}
      </Button>
      <Button type="button" variant="ghost" size="sm" icon={faPrint} onClick={handlePrint}>
        {t('analytics.printReport')}
      </Button>
    </div>
  );
}
