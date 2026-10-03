import { Suspense } from 'react';
import { ChartSkeleton } from './ChartCard';

export default function LazyChartBoundary({ children, tall }) {
  return (
    <Suspense fallback={<ChartSkeleton tall={tall} />}>
      {children}
    </Suspense>
  );
}
