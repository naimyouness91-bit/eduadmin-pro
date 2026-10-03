import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { isRtlActive } from '../../hooks/useRtl';

function Ripple({ x, y }) {
  return (
    <span
      className="sidebar-ripple pointer-events-none absolute rounded-full bg-primary-300/50 animate-sidebar-ripple"
      style={{ left: x, top: y, width: 10, height: 10, marginLeft: -5, marginTop: -5 }}
      aria-hidden
    />
  );
}

function ToggleShell({ top, left, anchorOnStart, children }) {
  return (
    <div
      style={{ position: 'fixed', top, left, zIndex: 300 }}
      className={[
        'hidden md:flex -translate-y-1/2 pointer-events-none animate-sidebar-toggle-float',
        anchorOnStart ? 'translate-x-1/2' : '-translate-x-1/2',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default function SidebarCollapseToggle({ expanded, onToggle, anchorRef }) {
  const btnRef = useRef(null);
  const [ripples, setRipples] = useState([]);
  const [coords, setCoords] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const rtl = isRtlActive();
    setCoords({
      top: rect.top + 36,
      left: rtl ? rect.left - 4 : rect.right + 4,
      anchorOnStart: rtl,
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    updatePosition();
    const anchor = anchorRef?.current;
    if (!anchor) return undefined;

    const ro = new ResizeObserver(updatePosition);
    ro.observe(anchor);

    let frame = 0;
    let frames = 0;
    const trackTransition = () => {
      updatePosition();
      if (frames++ < 35) frame = requestAnimationFrame(trackTransition);
    };
    trackTransition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    anchor.addEventListener('transitionend', updatePosition);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      anchor.removeEventListener('transitionend', updatePosition);
    };
  }, [anchorRef, expanded, updatePosition]);

  const handleClick = useCallback(
    (e) => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setRipples((prev) => [...prev, { id, x, y }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
      }
      onToggle?.();
    },
    [onToggle]
  );

  if (!coords || typeof document === 'undefined') return null;

  return createPortal(
    <ToggleShell top={coords.top} left={coords.left} anchorOnStart={coords.anchorOnStart}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        className={[
          'sidebar-collapse-toggle group pointer-events-auto flex',
          'w-10 h-10 rounded-full items-center justify-center',
          'overflow-hidden isolate',
          'border border-primary-400/30',
          'text-white',
          'shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.08)_inset] shadow-glow',
          'hover:border-primary-400/60 hover:shadow-glow',
          'hover:scale-110',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'active:scale-95',
        ].join(' ')}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={expanded}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-surface-700/90 via-surface-900/95 to-surface-950"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.18),transparent_55%)]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-[2px] rounded-full ring-1 ring-inset ring-white/10"
          aria-hidden
        />
        {ripples.map((r) => (
          <Ripple key={r.id} x={r.x} y={r.y} />
        ))}
        <FontAwesomeIcon
          icon={coords.anchorOnStart ? faChevronRight : faChevronLeft}
          className={[
            'relative z-[2] w-4 h-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
            'transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'group-hover:scale-110',
            expanded
              ? 'rotate-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5'
              : 'rotate-180 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </ToggleShell>,
    document.body
  );
}
