import { useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRtl } from '../../hooks/useRtl';
import { sidebarBackdropVariants, useMotionTransition } from '../../motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import SidebarNavItem from './SidebarNavItem';
import SidebarCollapseToggle from './SidebarCollapseToggle';

const roleColors = {
  super_admin: 'from-purple-500/20 to-purple-600/5 text-purple-300 border-purple-500/30',
  admin: 'from-blue-500/20 to-blue-600/5 text-blue-300 border-blue-500/30',
  teacher: 'from-emerald-500/20 to-emerald-600/5 text-emerald-300 border-emerald-500/30',
  student: 'from-orange-500/20 to-orange-600/5 text-orange-300 border-orange-500/30',
  parent: 'from-pink-500/20 to-pink-600/5 text-pink-300 border-pink-500/30',
};

export default function PremiumSidebar({
  navItems,
  user,
  expanded,
  mobileOpen,
  onToggleExpand,
  onCloseMobile,
  onLogout,
}) {
  const { isRtl, dir } = useRtl();
  const touchStartX = useRef(null);
  const sidebarRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current == null) return;
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      const swipeToClose = isRtl ? delta > 60 : delta < -60;
      if (swipeToClose) onCloseMobile?.();
      touchStartX.current = null;
    },
    [onCloseMobile, isRtl]
  );

  const roleBadge = roleColors[user?.role] || roleColors.admin;
  const backdropTransition = useMotionTransition(0.32);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="sidebar-backdrop"
            className="fixed inset-0 z-40 md:hidden bg-black/70 backdrop-blur-md"
            variants={sidebarBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={backdropTransition}
            onClick={onCloseMobile}
            aria-hidden={false}
          />
        )}
      </AnimatePresence>

      <aside
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Main navigation"
        dir={dir}
        className={[
          'premium-sidebar z-50 h-full flex flex-col overflow-visible',
          'max-md:fixed max-md:inset-y-0 max-md:start-0',
          'md:relative',
          'transition-[width,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'max-md:w-[min(17.5rem,88vw)]',
          expanded ? 'md:w-[17.5rem]' : 'md:w-[4.75rem]',
          mobileOpen
            ? 'translate-x-0 sidebar-mobile-open'
            : 'sidebar-mobile-closed md:translate-x-0',
        ].join(' ')}
      >
        {/* Ambient atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 -start-16 w-56 h-56 rounded-full bg-primary-600/20 blur-[80px] animate-sidebar-blob" />
          <div className="absolute bottom-20 -end-10 w-48 h-48 rounded-full bg-primary-500/15 blur-[70px] animate-sidebar-blob-delayed" />
          <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,rgb(var(--color-primary-500)/0.08),transparent_55%)]" />
        </div>

        {/* Glass panel */}
        <div className="sidebar-panel relative flex flex-col h-full overflow-visible bg-surface-950/80 backdrop-blur-2xl border-e border-white/[0.06]">
          {/* Logo */}
          <div className="sidebar-brand relative flex items-center gap-3 px-4 min-h-[4.5rem] overflow-visible border-b border-white/[0.06]">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl bg-primary-500/40 blur-md animate-sidebar-logo-glow" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow ring-1 ring-white/20">
                <FontAwesomeIcon icon={faGraduationCap} className="text-white text-base" />
              </div>
            </div>
            {(expanded || mobileOpen) && (
              <div className="sidebar-brand-text overflow-hidden animate-fade-in min-w-0 flex-1">
                <div className="font-display font-bold text-white text-[15px] leading-tight tracking-tight">
                  EduAdmin
                </div>
                <div className="text-[10px] text-primary-300/90 font-semibold tracking-[0.2em] uppercase mt-0.5">
                  Pro
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 py-4 overflow-y-auto overflow-x-hidden scrollbar-hide"
            role="navigation"
          >
            <motion.ul
              className="space-y-1.5 list-none m-0 p-0"
              initial="initial"
              animate="animate"
              variants={{
                animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
              }}
            >
              {navItems.map((item, index) => (
                <motion.li
                  key={item.path}
                  variants={{
                    initial: { opacity: 0, x: -12 },
                    animate: { opacity: 1, x: 0 },
                  }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  whileHover={{ x: 3, transition: { duration: 0.18 } }}
                >
                  <SidebarNavItem
                    item={item}
                    expanded={expanded || mobileOpen}
                    index={index}
                    onNavigate={onCloseMobile}
                  />
                </motion.li>
              ))}
            </motion.ul>
          </nav>

          {/* User footer */}
          <div className="relative p-3 border-t border-white/[0.06]">
            {expanded || mobileOpen ? (
              <div className="sidebar-user-block flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                <img
                  src={user?.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-lg object-cover ring-2 ring-primary-500/20 shrink-0"
                />
                <div className="sidebar-user-meta flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{user?.name}</div>
                  <span
                    className={[
                      'inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-gradient-to-r rtl:bg-gradient-to-l capitalize',
                      roleBadge,
                    ].join(' ')}
                  >
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 rounded-lg text-surface-500 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200 active:scale-95"
                  aria-label="Sign out"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="group relative flex items-center justify-center w-11 h-11 mx-auto rounded-xl text-surface-500 hover:text-danger-400 hover:bg-danger-500/10 border border-transparent hover:border-danger-500/20 transition-all duration-300"
                aria-label="Sign out"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4 rtl-mirror group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>

        <SidebarCollapseToggle
          expanded={expanded}
          onToggle={onToggleExpand}
          anchorRef={sidebarRef}
        />
      </aside>
    </>
  );
}
