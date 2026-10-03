import { useMemo } from 'react';
import { useUIStore } from '../../store';
import { buildChartOptions, gridColor, textColor } from '../../utils/chartTheme';

export const INTERACTIVE_TOOLTIP = {
  enabled: true,
  mode: 'index',
  intersect: false,
  backgroundColor: 'rgba(15,23,42,0.92)',
  titleColor: '#f8fafc',
  bodyColor: '#e2e8f0',
  borderColor: 'rgba(99,102,241,0.4)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 10,
  displayColors: true,
};

export function useAnalyticsScales(yAxisExtra = {}) {
  const { theme } = useUIStore();

  return useMemo(
    () => ({
      x: {
        grid: { color: gridColor() },
        ticks: { color: textColor(), font: { size: 11 }, maxRotation: 0 },
      },
      y: {
        grid: { color: gridColor() },
        ticks: { color: textColor(), font: { size: 11 } },
        beginAtZero: true,
        ...yAxisExtra,
      },
    }),
    [theme, yAxisExtra.min, yAxisExtra.max, yAxisExtra.stacked]
  );
}

export function useChartOptions(overrides = {}) {
  const { theme } = useUIStore();
  const scales = useAnalyticsScales(overrides.yAxis || {});

  return useMemo(
    () =>
      buildChartOptions({
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: overrides.showLegend ?? true,
            position: 'top',
            labels: { color: textColor(), boxWidth: 10, padding: 12, font: { size: 11 } },
          },
          tooltip: INTERACTIVE_TOOLTIP,
          ...(overrides.plugins || {}),
        },
        scales: overrides.scales || scales,
        ...(overrides.extra || {}),
      }),
    [theme, scales, overrides.showLegend, overrides.cutout]
  );
}
