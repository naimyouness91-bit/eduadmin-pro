import { MotionConfig } from 'framer-motion';

/**
 * Global motion config — uses full framer-motion (not LazyMotion) so
 * AnimatePresence + route transitions work reliably in all browsers.
 */
export default function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}>
      {children}
    </MotionConfig>
  );
}
