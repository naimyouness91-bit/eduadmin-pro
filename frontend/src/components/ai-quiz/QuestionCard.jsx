import { useTranslation } from 'react-i18next';

export default function QuestionCard({
  question,
  index,
  value,
  onChange,
  disabled,
  showReview,
  reviewData,
}) {
  const { t } = useTranslation();

  const typeLabel = t(`aiQuizPage.questionTypes.${question.type}`, { defaultValue: question.type });
  const questionMeta = t('aiQuizPage.questionLabel', { number: index + 1, type: typeLabel });

  if (showReview && reviewData) {
    return (
      <div
        className={`rounded-2xl border p-4 space-y-3 ${
          reviewData.is_correct
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20'
        }`}
      >
        <div className="flex justify-between gap-2 text-xs text-surface-500">
          <span>{questionMeta}</span>
          <span>{t('aiQuizPage.pointsShort', { count: reviewData.points_earned })}</span>
        </div>
        <p className="font-medium text-surface-900 dark:text-white">{question.question}</p>
        <p className="text-sm">
          <span className="text-surface-500">{t('aiQuizPage.yourAnswer')} </span>
          {reviewData.your_answer || '—'}
        </p>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          {t('aiQuizPage.correct')} {reviewData.correct_answer}
        </p>
        {reviewData.explanation && (
          <p className="text-xs text-surface-500">{reviewData.explanation}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-4 space-y-3 shadow-sm">
      <div className="text-xs text-surface-500">
        {questionMeta}
      </div>
      <p className="font-medium text-surface-900 dark:text-white">{question.question}</p>

      {question.type === 'mcq' && question.options && (
        <div className="space-y-2">
          {Object.entries(question.options).map(([key, label]) => (
            <label
              key={key}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                value === label || value === key
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                  : 'border-surface-200 dark:border-surface-600 hover:border-primary-300'
              }`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === label || value === key}
                disabled={disabled}
                onChange={() => onChange(label)}
                className="text-primary-600"
              />
              <span className="text-sm">
                <strong>{key}.</strong> {label}
              </span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-2">
          {[
            { value: 'True', label: t('aiQuizPage.true') },
            { value: 'False', label: t('aiQuizPage.false') },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${
                value === opt.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-surface-200 dark:border-surface-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {question.type === 'short_answer' && (
        <input
          type="text"
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('aiQuizPage.typeAnswerPlaceholder')}
          className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
