import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartPie } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '../../components/common/UI';
import { useAnalyticsDashboard } from '../../hooks/useAnalyticsDashboard';
import { computeAnalyticsKpis } from '../../utils/analyticsTransform';
import { applyPeriodPreset, buildInsights } from '../../utils/analyticsInsights';
import { DEFAULT_ANALYTICS_FILTERS } from '../../config/analyticsCharts';
import '../../components/analytics/chartSetup';
import AnalyticsPeriodFilters from '../../components/analytics/AnalyticsPeriodFilters';
import AnalyticsPremiumKpiRow from '../../components/analytics/AnalyticsPremiumKpiRow';
import AnalyticsInsights from '../../components/analytics/AnalyticsInsights';
import AnalyticsExportBar from '../../components/analytics/AnalyticsExportBar';
import LazyChartBoundary from '../../components/analytics/LazyChartBoundary';
import { ChartSkeleton } from '../../components/analytics/ChartCard';

const AnalyticsChartPanels = lazy(() => import('../../components/analytics/AnalyticsChartPanels'));

export default function Analytics() {
  const { t } = useTranslation();
  const [year, setYear] = useState(DEFAULT_ANALYTICS_FILTERS.year);
  const [monthFrom, setMonthFrom] = useState(DEFAULT_ANALYTICS_FILTERS.monthFrom);
  const [monthTo, setMonthTo] = useState(DEFAULT_ANALYTICS_FILTERS.monthTo);
  const [preset, setPreset] = useState('year');

  const { analytics, platform, loading, exportExcel } = useAnalyticsDashboard(year);

  const handlePresetChange = (next) => {
    setPreset(next);
    const applied = applyPeriodPreset(next);
    setYear(applied.year);
    setMonthFrom(applied.monthFrom);
    setMonthTo(applied.monthTo);
  };

  const kpis = useMemo(
    () => computeAnalyticsKpis(analytics, monthFrom, monthTo),
    [analytics, monthFrom, monthTo]
  );

  const insights = useMemo(() => buildInsights(analytics), [analytics]);

  return (
    <div id="analytics-dashboard" className="space-y-8 animate-fade-in pb-8">
      <div className="rounded-3xl border border-surface-200/80 dark:border-surface-700/50 bg-gradient-to-br from-primary-500/5 via-transparent to-purple-500/5 p-6 sm:p-8">
        <PageHeader
          title={t('analytics.title')}
          subtitle={t('analytics.subtitle')}
          actions={
            <AnalyticsExportBar
              kpis={kpis}
              insights={insights}
              year={year}
              monthFrom={monthFrom}
              monthTo={monthTo}
              onExportExcel={exportExcel}
            />
          }
        />
        <div className="mt-4 flex items-center gap-2 text-sm text-surface-500">
          <FontAwesomeIcon icon={faChartPie} className="w-4 h-4 text-primary-500" />
          <span>Premium school analytics · real-time insights</span>
        </div>
        <div className="mt-5">
          <AnalyticsPeriodFilters
            preset={preset}
            onPresetChange={handlePresetChange}
            year={year}
            monthFrom={monthFrom}
            monthTo={monthTo}
            onYearChange={setYear}
            onMonthFromChange={(v) => { setPreset('custom'); setMonthFrom(v); }}
            onMonthToChange={(v) => { setPreset('custom'); setMonthTo(v); }}
          />
        </div>
      </div>

      <AnalyticsPremiumKpiRow
        analytics={analytics}
        platform={platform}
        monthFrom={monthFrom}
        monthTo={monthTo}
        loading={loading}
      />

      <div>
        <h2 className="font-display font-bold text-lg text-surface-900 dark:text-white mb-4">Advanced Insights</h2>
        <AnalyticsInsights insights={insights} loading={loading} />
      </div>

      <LazyChartBoundary tall>
        <Suspense fallback={<ChartSkeleton tall />}>
          <AnalyticsChartPanels
            analytics={analytics}
            platform={platform}
            monthFrom={monthFrom}
            monthTo={monthTo}
            year={year}
            loading={loading}
          />
        </Suspense>
      </LazyChartBoundary>
    </div>
  );
}
