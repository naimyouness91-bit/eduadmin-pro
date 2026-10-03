import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function AnalyticsSectionHeader({ title, subtitle, icon }) {
  return (
    <div className="flex items-start gap-3 pt-2">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/10 flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={icon} className="w-4 h-4 text-primary-500" />
        </div>
      )}
      <div>
        <h2 className="font-display font-bold text-lg text-surface-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
