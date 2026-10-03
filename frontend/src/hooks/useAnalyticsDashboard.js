import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  analyticsAPI,
  dashboardAPI,
  parentsAPI,
  assignmentsAPI,
  meetingsAPI,
  activityLogsAPI,
  notificationsAPI,
  importExportAPI,
} from '../services/api';

export function useAnalyticsDashboard(year) {
  const [analytics, setAnalytics] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        analyticsRes,
        dashboardRes,
        parentsRes,
        assignmentsRes,
        meetingsRes,
        logsRes,
        notificationsRes,
      ] = await Promise.all([
        analyticsAPI.overview({ year }),
        dashboardAPI.get(),
        parentsAPI.list({ per_page: 1 }).catch(() => ({ data: { total: 0 } })),
        assignmentsAPI.list({ per_page: 100 }).catch(() => ({ data: { data: [], total: 0 } })),
        meetingsAPI.list({ per_page: 1 }).catch(() => ({ data: { total: 0 } })),
        activityLogsAPI.list({ per_page: 1 }).catch(() => ({ data: { total: 0 } })),
        notificationsAPI.list({ per_page: 1 }).catch(() => ({ data: { total: 0 } })),
      ]);

      const assignments = assignmentsRes.data.data ?? [];
      const stats = dashboardRes.data?.stats ?? {};

      setAnalytics(analyticsRes.data);
      setPlatform({
        stats,
        attendanceTrend: dashboardRes.data?.attendance_trend ?? [],
        gradeDistributionAdmin: dashboardRes.data?.grade_distribution ?? {},
        parentsTotal: parentsRes.data.total ?? 0,
        assignmentsTotal: assignmentsRes.data.total ?? assignments.length,
        submissionsTotal: assignments.reduce((sum, a) => sum + (a.submissions_count ?? 0), 0),
        meetingsTotal: meetingsRes.data.total ?? 0,
        activityTotal: logsRes.data.total ?? 0,
        notificationsTotal: notificationsRes.data.total ?? 0,
        messagesTotal: 0,
        activeUsers:
          (stats.total_students ?? 0) + (stats.total_teachers ?? 0) + (parentsRes.data.total ?? 0),
      });
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const exportExcel = useCallback(async () => {
    try {
      await importExportAPI.export('grades');
    } catch {
      toast.error('Excel export failed');
    }
  }, []);

  return { analytics, platform, loading, reload: load, exportExcel };
}
