import { Card } from '../common/UI';

export function ChartSkeleton({ tall }) {
  return (
    <div className={`chart-responsive ${tall ? 'lg:h-72' : ''} rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse`} />
  );
}

export default function ChartCard({ title, subtitle, loading, tall, children, className = '', actions }) {
  return (
    <Card title={title} subtitle={subtitle} actions={actions} className={`h-full flex flex-col ${className}`} padding>
      {loading ? (
        <ChartSkeleton tall={tall} />
      ) : (
        <div className={`chart-responsive ${tall ? 'lg:h-72' : ''}`}>{children}</div>
      )}
    </Card>
  );
}
