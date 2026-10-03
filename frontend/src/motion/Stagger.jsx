import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, useMotionTransition } from './index';

export function StaggerGrid({ children, className = '' }) {
  const transition = useMotionTransition(0.35);

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  const transition = useMotionTransition(0.3);

  return (
    <motion.div className={className} variants={staggerItem} transition={transition}>
      {children}
    </motion.div>
  );
}
