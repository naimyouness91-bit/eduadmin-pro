import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import DraggableWidget from './DraggableWidget';
import { StaggerGrid, StaggerItem } from '../../motion/Stagger';
import {
  ADMIN_WIDGET_META,
  mergeRowOrder,
  orderForRow,
  persistWidgetOrder,
  normalizeWidgetOrder,
  DASHBOARD_LAYOUT_STORAGE_KEY,
  DEFAULT_ADMIN_WIDGET_ORDER,
} from '../../config/dashboardWidgets';

function DashboardRow({ rowKey, order, renderWidget, getWidgetLabel }) {
  const rowOrder = orderForRow(order, rowKey);
  if (!rowOrder.length) return null;

  return (
    <SortableContext id={`dashboard-row-${rowKey}`} items={rowOrder} strategy={rectSortingStrategy}>
      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
        role="list"
        aria-label={`Dashboard row ${rowKey}`}
      >
        {rowOrder.map((widgetId, index) => (
          <DraggableWidget
            key={widgetId}
            id={widgetId}
            label={getWidgetLabel(widgetId)}
            sortOrder={index}
          >
            {renderWidget(widgetId)}
          </DraggableWidget>
        ))}
      </div>
    </SortableContext>
  );
}

export default function DashboardWidgetGrid({
  order,
  onOrderChange,
  renderWidget,
  getWidgetLabel,
  fixedKpiSlot,
  quickActionsSlot,
  recentTasksSlot,
}) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const activeRow = ADMIN_WIDGET_META[active.id]?.row;
      const overRow = ADMIN_WIDGET_META[over.id]?.row;
      if (!activeRow || activeRow !== overRow) return;

      const rowOrder = orderForRow(order, activeRow);
      const oldIndex = rowOrder.indexOf(active.id);
      const newIndex = rowOrder.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const newRowOrder = arrayMove(rowOrder, oldIndex, newIndex);
      const next = mergeRowOrder(order, activeRow, newRowOrder);
      persistWidgetOrder(next, DASHBOARD_LAYOUT_STORAGE_KEY, DEFAULT_ADMIN_WIDGET_ORDER);
      onOrderChange(normalizeWidgetOrder(next));
    },
    [order, onOrderChange]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-4">
        {/* Row 1 — KPI cards (4 equal columns on desktop) */}
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
          <SortableContext id="dashboard-row-kpi" items={orderForRow(order, 'kpi')} strategy={rectSortingStrategy}>
            {orderForRow(order, 'kpi').map((widgetId, index) => (
              <StaggerItem key={widgetId} className="h-full">
                <DraggableWidget
                  id={widgetId}
                  label={getWidgetLabel(widgetId)}
                  sortOrder={index}
                  className="h-full !col-span-1"
                >
                  {renderWidget(widgetId)}
                </DraggableWidget>
              </StaggerItem>
            ))}
          </SortableContext>
          {fixedKpiSlot}
        </StaggerGrid>

        {/* Row 2 — Attendance (8) + Grades (4) */}
        <DashboardRow
          rowKey="charts"
          order={order}
          renderWidget={renderWidget}
          getWidgetLabel={getWidgetLabel}
        />

        {/* Row 3 — Activity (8) + Notifications (4) */}
        <DashboardRow
          rowKey="activity"
          order={order}
          renderWidget={renderWidget}
          getWidgetLabel={getWidgetLabel}
        />

        {/* Row 4 — Calendar (4) + Quick actions (4) + Recent tasks (4) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
          <SortableContext id="dashboard-row-bottom" items={orderForRow(order, 'bottom')} strategy={rectSortingStrategy}>
            {orderForRow(order, 'bottom').map((widgetId, index) => (
              <DraggableWidget
                key={widgetId}
                id={widgetId}
                label={getWidgetLabel(widgetId)}
                sortOrder={index}
              >
                {renderWidget(widgetId)}
              </DraggableWidget>
            ))}
          </SortableContext>
          <div className="col-span-1 lg:col-span-4 h-full flex flex-col min-h-0">
            {quickActionsSlot}
          </div>
          <div className="col-span-1 lg:col-span-4 h-full flex flex-col min-h-0">
            {recentTasksSlot}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeId ? (
          <div className="opacity-95 cursor-grabbing w-full max-w-xl">
            {renderWidget(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
