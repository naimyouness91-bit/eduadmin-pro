import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { cardVariants, useMotionTransition } from '../../motion';

const styles = {
  primary: 'border-primary-500/20 bg-primary-500/5',
  success: 'border-success-500/20 bg-success-500/5',
  warning: 'border-warning-500/20 bg-warning-500/5',
  info: 'border-info-500/20 bg-info-500/5',
};

const iconStyles = {
  primary: 'text-primary-500 bg-primary-500/10',
  success: 'text-success-500 bg-success-500/10',
  warning: 'text-warning-500 bg-warning-500/10',
  info: 'text-info-500 bg-info-500/10',
};

function AnimatedValue({ value }) {
  const raw = value ?? '';
  const isNumeric = typeof raw === 'number' || (typeof raw === 'string' && /^\d[\d,.\s]*$/.test(String(raw).trim()));
  const target = isNumeric ? Number(String(raw).replace(/[^\d.]/g, '')) : 0;
  const animated = useAnimatedCounter(target, 600);
  if (!isNumeric || Number.isNaN(target)) return raw;
  return animated.toLocaleString();
}

export default function MiniStatCard({ title, value, icon, color = 'primary', loading, index = 0 }) {
  const transition = useMotionTransition(0.3);

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 animate-pulse h-[88px]">
        <div className="h-3 w-20 bg-surface-200 dark:bg-surface-700 rounded mb-3" />
        <div className="h-7 w-12 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      className={`rounded-xl border p-4 flex items-center justify-between ${styles[color]}`}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      transition={{ ...transition, delay: index * 0.07 }}
      whileHover={{ y: -2, scale: 1.015, transition: { duration: 0.2 } }}
    >
      <div>
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{title}</p>
        <p className="font-display text-2xl font-bold text-surface-900 dark:text-white mt-1 tabular-nums">
          <AnimatedValue value={value} />
        </p>
      </div>
      <motion.div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconStyles[color]}`}
        whileHover={{ scale: 1.08, rotate: 4 }}
        transition={{ duration: 0.2 }}
      >
        <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      </motion.div>
    </motion.div>
  );
}
