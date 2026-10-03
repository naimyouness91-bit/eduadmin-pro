export const isDark = () => document.documentElement.classList.contains('dark');
export const isRtlLayout = () => document.documentElement.dir === 'rtl';
export const gridColor = () =>
  isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
export const textColor = () => (isDark() ? '#94a3b8' : '#64748b');

export const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

/** Merge chart options with RTL-aware legend and scale labels */
export function buildChartOptions(overrides = {}) {
  const rtl = isRtlLayout();
  const tickAlign = rtl ? 'end' : 'start';

  return {
    ...chartDefaults,
    ...overrides,
    plugins: {
      ...chartDefaults.plugins,
      ...(overrides.plugins || {}),
      legend: {
        display: false,
        rtl,
        ...(overrides.plugins?.legend || {}),
        labels: {
          textAlign: rtl ? 'right' : 'left',
          ...(overrides.plugins?.legend?.labels || {}),
        },
      },
      tooltip: {
        rtl,
        ...(overrides.plugins?.tooltip || {}),
      },
    },
    scales: overrides.scales
      ? Object.fromEntries(
          Object.entries(overrides.scales).map(([key, scale]) => [
            key,
            {
              ...scale,
              ticks: {
                ...(scale?.ticks || {}),
                mirror: false,
                crossAlign: tickAlign,
              },
            },
          ])
        )
      : overrides.scales,
  };
}
