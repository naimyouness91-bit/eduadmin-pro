import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { ADMIN_WIDGET_META, getSlotColClass } from '../../config/dashboardWidgets';

export default function DraggableWidget({ id, children, label, className = '', sortOrder = 0 }) {
  const meta = ADMIN_WIDGET_META[id] ?? { slot: 'narrow' };
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
  };

  return (
    <div
      className={[
        getSlotColClass(meta.slot),
        className,
        'min-w-0 h-full',
        isDragging ? 'opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ order: sortOrder }}
    >
      <div
        ref={setNodeRef}
        style={style}
        className="relative group/widget h-full flex flex-col isolate"
      >
        {/* Drag handle — only this element starts a drag (setActivatorNodeRef) */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Drag ${label}`}
          aria-roledescription="sortable"
          {...attributes}
          {...listeners}
          className={[
            'absolute top-2 end-2 z-30 p-2 rounded-lg touch-none select-none',
            'bg-white/90 dark:bg-surface-800/90 backdrop-blur-sm',
            'border border-surface-200/80 dark:border-surface-600/80 shadow-sm',
            'text-surface-400 hover:text-primary-500 hover:border-primary-500/30',
            'cursor-grab active:cursor-grabbing',
            'opacity-0 group-hover/widget:opacity-100 focus:opacity-100 transition-opacity duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
            isDragging ? 'opacity-100 cursor-grabbing ring-2 ring-primary-500/40' : '',
          ].join(' ')}
          onClick={(e) => e.preventDefault()}
        >
          <FontAwesomeIcon icon={faGripVertical} className="w-3.5 h-3.5 pointer-events-none" />
        </button>

        {/* Widget content — below handle in stacking order; does not activate drag */}
        <div className="relative z-0 flex-1 min-h-0 [&>*]:h-full">{children}</div>
      </div>
    </div>
  );
}
