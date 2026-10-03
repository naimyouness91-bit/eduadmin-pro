import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/** Visible fade + slide — 0.36s, tuned for route changes */
export const PAGE_MOTION = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.36, ease: [0.25, 0.1, 0.25, 1] },
};

/**
 * Wraps routed page content. Must receive a unique `routeKey` per navigation
 * (use `location.pathname` or `location.key`).
 */
export default function PageTransition({ children, routeKey }) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        className="page-transition-root w-full min-w-0"
        initial={reduced ? false : PAGE_MOTION.initial}
        animate={PAGE_MOTION.animate}
        exit={reduced ? undefined : PAGE_MOTION.exit}
        transition={reduced ? { duration: 0 } : PAGE_MOTION.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
