import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

export default function SuggestedPrompts({ prompts, onSelect, disabled }) {
  const { t } = useTranslation();
  if (!prompts?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-surface-500 uppercase tracking-wide flex items-center gap-2">
        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary-500" />
        {t('aiStudyPage.suggestedActions')}
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(p)}
            className="text-left text-xs sm:text-sm px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/60 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
