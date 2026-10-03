import { useCallback, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import {
  DEFAULT_ADMIN_WIDGET_ORDER,
  DASHBOARD_LAYOUT_STORAGE_KEY,
  normalizeWidgetOrder,
  persistWidgetOrder,
  readStoredWidgetOrder,
} from '../config/dashboardWidgets';

export function useDashboardLayout(
  storageKey = DASHBOARD_LAYOUT_STORAGE_KEY,
  defaultOrder = DEFAULT_ADMIN_WIDGET_ORDER
) {
  const [order, setOrder] = useState(() => readStoredWidgetOrder(storageKey, defaultOrder));

  const resetLayout = useCallback(() => {
    const next = [...defaultOrder];
    persistWidgetOrder(next, storageKey, defaultOrder);
    setOrder(next);
  }, [storageKey, defaultOrder]);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrder((current) => {
        const oldIndex = current.indexOf(active.id);
        const newIndex = current.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0) return current;
        const next = arrayMove(current, oldIndex, newIndex);
        persistWidgetOrder(next, storageKey, defaultOrder);
        return normalizeWidgetOrder(next, defaultOrder);
      });
    },
    [storageKey, defaultOrder]
  );

  return {
    order: normalizeWidgetOrder(order, defaultOrder),
    setOrder,
    resetLayout,
    handleDragEnd,
  };
}
