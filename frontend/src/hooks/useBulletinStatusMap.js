import { useEffect, useRef, useState } from 'react';
import { reportsAPI } from '../services/api';

const MAX_BATCH = 80;

/**
 * Loads bulletin status for multiple students (admin Grades workflow).
 * Uses a single batch API call to avoid overloading php artisan serve.
 */
export function useBulletinStatusMap(studentIds = []) {
  const cacheRef = useRef({});
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(false);

  const idsKey = [...new Set(studentIds.filter(Boolean))]
    .sort((a, b) => a - b)
    .slice(0, MAX_BATCH)
    .join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (!ids.length) {
      setStatusMap({});
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const missing = ids.filter((id) => !cacheRef.current[id]);

    const load = async () => {
      try {
        if (missing.length === 1) {
          const { data } = await reportsAPI.getBulletinStatus(missing[0]);
          cacheRef.current[missing[0]] = data.data;
        } else if (missing.length > 1) {
          const { data } = await reportsAPI.getBulletinStatusesBatch(missing);
          Object.entries(data.data ?? {}).forEach(([id, payload]) => {
            cacheRef.current[Number(id)] = payload;
          });
        }
      } catch {
        missing.forEach((id) => {
          if (!cacheRef.current[id]) {
            cacheRef.current[id] = { status: 'draft' };
          }
        });
      }

      if (!cancelled) {
        const next = {};
        ids.forEach((id) => {
          next[id] = cacheRef.current[id] ?? { status: 'draft' };
        });
        setStatusMap(next);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const updateStatus = (studentId, payload) => {
    if (!studentId || !payload) return;
    cacheRef.current[studentId] = payload;
    setStatusMap((prev) => ({ ...prev, [studentId]: payload }));
  };

  return { statusMap, loading, updateStatus };
}
