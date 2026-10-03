import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';

const COLOR_MAP = {
  primary: {
    ring: 'ring-primary-500/20',
    glow: 'shadow-[0_0_24px_rgba(99,102,241,0.15)]',
    icon: 'bg-primary-500/15 text-primary-500',
    bar: 'from-primary-500 to-violet-500',
  },
  success: {
    ring: 'ring-success-500/20',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.15)]',
    icon: 'bg-success-500/15 text-success-500',
    bar: 'from-success-500 to-emerald-400',
  },
  warning: {
    ring: 'ring-warning-500/20',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.15)]',
    icon: 'bg-warning-500/15 text-warning-500',
    bar: 'from-warning-500 to-amber-400',
  },
  info: {
    ring: 'ring-info-500/20',
    glow: 'shadow-[0_0_24px_rgba(59,130,246,0.15)]',
    icon: 'bg-info-500/15 text-info-500',
    bar: 'from-info-500 to-cyan-400',
  },
};

export function StudentPageShell({ title, subtitle, actions, children }) {
  const { t } = useTranslation();
  return (
    <div className="relative space-y-6 animate-fade-in pb-8">
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary-500/10 blur-[100px]" aria-hidden />
      <div className="pointer-events-none absolute top-40 -right-16 w-64 h-64 rounded-full bg-violet-500/10 blur-[90px]" aria-hidden />

      <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-400/90 mb-1">{t('studentPages.portalLabel')}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">{actions}</div>}
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

export function GlassCard({ className = '', children, padding = true, hover = false }) {
  return (
    <div
      className={[
        'rounded-2xl border border-white/10 dark:border-white/[0.06]',
        'bg-white/70 dark:bg-surface-900/60 backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        hover ? 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover' : '',
        padding ? 'p-5 lg:p-6' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function StudentStatCard({ title, value, suffix = '', icon, color = 'primary', loading }) {
  const palette = COLOR_MAP[color] || COLOR_MAP.primary;
  const numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.]/g, '')) || 0;
  const animated = useAnimatedCounter(loading ? 0 : numeric);

  return (
    <GlassCard hover className={`ring-1 ${palette.ring} ${palette.glow}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">{title}</p>
          {loading ? (
            <div className="h-9 w-24 mt-2 rounded-lg bg-surface-200 dark:bg-surface-700 animate-pulse" />
          ) : (
            <p className="font-display text-3xl font-bold text-surface-900 dark:text-white mt-1 tabular-nums">
              {typeof value === 'string' && value.includes('%')
                ? value
                : `${animated}${suffix}`}
            </p>
          )}
          <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${palette.bar} mt-3 opacity-80`} />
        </div>
        {icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${palette.icon}`}>
            <FontAwesomeIcon icon={icon} className="w-5 h-5" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export function StudentEmptyState({ icon, title, description, action }) {
  return (
    <GlassCard className="text-center py-12">
      {icon && (
        <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 mb-4">
          <FontAwesomeIcon icon={icon} className="w-6 h-6" />
        </div>
      )}
      <h3 className="font-semibold text-surface-900 dark:text-white">{title}</h3>
      {description && <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </GlassCard>
  );
}

export function StudentSkeletonGrid({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-surface-200/80 dark:bg-surface-800 animate-pulse" />
      ))}
    </div>
  );
}

export function RippleButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`relative overflow-hidden active:scale-[0.98] transition-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
