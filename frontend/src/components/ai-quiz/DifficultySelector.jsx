import { useTranslation } from 'react-i18next';

export default function DifficultySelector({
  difficulties,
  questionCounts,
  questionTypes,
  values,
  onChange,
  disabled,
}) {
  const { t } = useTranslation();

  const toggleType = (type) => {
    const current = values.question_types ?? [];
    const next = current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type];
    onChange({ ...values, question_types: next.length ? next : [type] });
  };

  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-5 shadow-sm space-y-4">
      <h3 className="font-display font-semibold text-surface-900 dark:text-white">{t('aiQuizPage.quizSettings')}</h3>

      <div>
        <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">{t('aiQuizPage.difficulty')}</p>
        <div className="flex flex-wrap gap-2">
          {(difficulties ?? []).map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...values, difficulty: d.value })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                values.difficulty === d.value
                  ? 'bg-primary-600 text-white'
                  : 'border border-surface-200 dark:border-surface-600 hover:border-primary-400'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-surface-500 uppercase tracking-wide block mb-2">
          {t('aiQuizPage.numberOfQuestions')}
        </label>
        <select
          value={values.question_count}
          disabled={disabled}
          onChange={(e) => onChange({ ...values, question_count: Number(e.target.value) })}
          className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
        >
          {(questionCounts ?? [5, 10, 15, 20]).map((n) => (
            <option key={n} value={n}>
              {t('aiQuizPage.questionsOption', { count: n })}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">{t('aiQuizPage.questionTypesLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {(questionTypes ?? []).map((item) => {
            const active = (values.question_types ?? []).includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleType(item.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'border border-surface-200 dark:border-surface-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
