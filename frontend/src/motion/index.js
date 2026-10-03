import { useReducedMotion } from 'framer-motion';

export { default as MotionProvider } from './MotionProvider';

/** SaaS-grade motion tokens — fast, subtle, non-aggressive */
export const MOTION = {
  duration: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.4,
  },
  ease: {
    out: [0.25, 0.1, 0.25, 1],
    spring: { type: 'spring', stiffness: 420, damping: 32 },
    soft: [0.16, 1, 0.3, 1],
  },
};

export function useMotionTransition(duration = MOTION.duration.normal) {
  const reduced = useReducedMotion();
  if (reduced) return { duration: 0.01 };
  return { duration, ease: MOTION.ease.out };
}

export const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalBackdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalPanelVariants = {
  initial: { opacity: 0, scale: 0.97, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 8 },
};

export const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export const tableRowVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
};

export const sidebarBackdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const sidebarPanelVariants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
};

export const navItemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
};

export const toastVariants = {
  initial: { opacity: 0, x: 40, scale: 0.96 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 40, scale: 0.96 },
};

export { useReducedMotion };
