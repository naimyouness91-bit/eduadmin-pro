import { useRef, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function Ripple({ x, y }) {
  return (
    <span
      className="sidebar-ripple pointer-events-none absolute rounded-full bg-white/25 animate-sidebar-ripple"
      style={{ left: x, top: y, width: 8, height: 8, marginLeft: -4, marginTop: -4 }}
      aria-hidden
    />
  );
}

export default function SidebarNavItem({ item, expanded, index = 0, onNavigate }) {
  const [ripples, setRipples] = useState([]);
  const linkRef = useRef(null);

  const handleClick = useCallback((e) => {
    const rect = linkRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
    onNavigate?.();
  }, [onNavigate]);

  const isExact = item.path === '/dashboard';

  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full"
    >
    <NavLink
      ref={linkRef}
      to={item.path}
      end={isExact}
      onClick={handleClick}
      title={!expanded ? item.label : undefined}
      aria-label={item.label}
      className={({ isActive }) =>
        [
          'sidebar-nav-item group relative flex items-center rounded-xl text-[13px] font-medium',
          'outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950',
          'transition-colors duration-200 ease-out',
          expanded ? 'gap-3 px-3 py-2.5 mx-2 justify-start' : 'justify-center w-11 h-11 mx-auto',
          isActive ? 'sidebar-nav-item--active' : 'sidebar-nav-item--idle',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {/* Active left indicator */}
          <span
            className={[
              'sidebar-nav-item--active-bar absolute start-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-gradient-to-b from-primary-300 via-primary-500 to-primary-600',
              'transition-all duration-300 ease-out',
              isActive ? 'h-7 opacity-100 shadow-[0_0_12px_rgb(var(--color-primary-500)/0.8)]' : 'h-0 opacity-0',
            ].join(' ')}
            aria-hidden
          />

          {/* Glow backdrop for active */}
          {isActive && (
            <span
              className="absolute inset-0 rounded-xl bg-gradient-to-r rtl:bg-gradient-to-l from-primary-500/20 via-primary-400/10 to-transparent border border-primary-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_20px_rgb(var(--color-primary-500)/0.15)]"
              aria-hidden
            />
          )}

          {/* Icon */}
          <span
            className={[
              'relative z-10 flex shrink-0 items-center justify-center rounded-lg transition-all duration-300',
              expanded ? 'w-8 h-8' : 'w-9 h-9',
              isActive
                ? 'bg-primary-500/25 text-primary-200 shadow-[0_0_16px_rgb(var(--color-primary-500)/0.45)] scale-105'
                : 'bg-white/[0.03] text-surface-400 group-hover:bg-white/[0.06] group-hover:text-white group-hover:scale-110 group-hover:-translate-y-0.5',
            ].join(' ')}
          >
            <FontAwesomeIcon
              icon={item.icon}
              className={[
                'transition-transform duration-300',
                expanded ? 'w-[15px] h-[15px]' : 'w-4 h-4',
                isActive ? 'animate-sidebar-icon-pulse' : 'group-hover:scale-110',
              ].join(' ')}
            />
          </span>

          {/* Label */}
          {expanded && (
            <span
              className={[
                'sidebar-nav-label relative z-10 flex-1 min-w-0 truncate text-start transition-all duration-300',
                isActive ? 'text-white font-semibold' : 'text-surface-400 group-hover:text-white',
              ].join(' ')}
            >
              {item.label}
            </span>
          )}

          {/* Collapsed tooltip */}
          {!expanded && (
            <span
              className="sidebar-tooltip pointer-events-none absolute top-1/2 z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-surface-800/95 border border-white/10 shadow-xl opacity-0 whitespace-nowrap backdrop-blur-md transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              role="tooltip"
            >
              {item.label}
            </span>
          )}

          {/* Hover shimmer */}
          <span
            className="sidebar-nav-shimmer absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"
            aria-hidden
          />

          {ripples.map((r) => (
            <Ripple key={r.id} x={r.x} y={r.y} />
          ))}
        </>
      )}
    </NavLink>
    </motion.div>
  );
}
