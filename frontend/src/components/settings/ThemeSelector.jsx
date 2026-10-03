import { COLOR_THEME_OPTIONS } from '../../config/colorThemes';
import { useUIStore } from '../../store';

export default function ThemeSelector({ onSelect }) {
  const { colorTheme, setColorTheme } = useUIStore();

  const handleSelect = (id) => {
    setColorTheme(id);
    onSelect?.(id);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-surface-500 dark:text-surface-400">
        Choose a brand color applied across the dashboard, sidebar, buttons, and charts.
      </p>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        role="radiogroup"
        aria-label="Color theme"
      >
        {COLOR_THEME_OPTIONS.map((theme) => {
          const selected = colorTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(theme.id)}
              className={[
                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200',
                'hover:scale-[1.02] active:scale-[0.98]',
                selected
                  ? 'border-primary-500 bg-primary-500/10 shadow-glow ring-2 ring-primary-500/30'
                  : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 hover:border-primary-300 dark:hover:border-primary-700',
              ].join(' ')}
            >
              <span
                className="w-12 h-12 rounded-full shadow-md ring-2 ring-white/80 dark:ring-surface-900/80"
                style={{
                  background: `linear-gradient(135deg, ${theme.preview} 0%, ${theme.accent} 100%)`,
                }}
                aria-hidden
              />
              <span
                className={`text-sm font-semibold ${selected ? 'text-primary-600 dark:text-primary-400' : 'text-surface-700 dark:text-surface-300'}`}
              >
                {theme.label}
              </span>
              {selected && (
                <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-primary-500" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
