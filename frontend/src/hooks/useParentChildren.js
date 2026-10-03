import { useCallback, useEffect, useMemo, useState } from 'react';
import { parentAPI } from '../services/api';

/**
 * Load children linked to the authenticated parent account.
 */
export function useParentChildren() {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await parentAPI.children();
      const list = data.data ?? [];
      setChildren(list);
      setSelectedId((prev) => {
        if (prev && list.some((c) => String(c.student?.id ?? c.id) === String(prev))) {
          return prev;
        }
        const first = list[0];
        return first ? String(first.student?.id ?? first.id) : '';
      });
    } catch (err) {
      setChildren([]);
      setSelectedId('');
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedEntry = useMemo(
    () =>
      children.find((c) => String(c.student?.id ?? c.id) === String(selectedId)) ?? null,
    [children, selectedId]
  );

  const student = selectedEntry?.student ?? selectedEntry;

  return {
    children,
    selectedId,
    setSelectedId,
    selectedEntry,
    student,
    studentId: student?.id ?? null,
    loading,
    error,
    reload: load,
  };
}

export default useParentChildren;
