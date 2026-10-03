import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslation } from 'react-i18next';
import { faCheckCircle, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { Badge, Button } from '../common/UI';

export default function QuizPreviewPanel({ preview, onSave, onRegenerate, saving, regenerating }) {
  const { t } = useTranslation();

  if (!preview?.questions?.length) return null;

  return (
    <div className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/20 p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faCircleQuestion} className="text-primary-500" />
            {t('aiQuizPage.previewTitle')}
          </h3>
          <p className="text-sm text-surface-500 mt-1">
            {t('aiQuizPage.previewSubtitle', {
              count: preview.questions.length,
              mode: preview.generator_label || t('aiQuizPage.localModeLabel'),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            loading={regenerating}
            disabled={saving}
          >
            {t('aiQuizPage.regenerate')}
          </Button>
          <Button type="button" size="sm" onClick={onSave} loading={saving} disabled={regenerating}>
            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
            {t('aiQuizPage.saveQuiz')}
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-[32rem] overflow-y-auto pe-1">
        {preview.questions.map((q, i) => (
          <article
            key={`${q.sort_order}-${i}`}
            className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-surface-500">
                {t('aiQuizPage.questionNumber', { number: i + 1 })}
              </span>
              <Badge color="info" size="sm">
                {t(`aiQuizPage.questionTypes.${q.type}`, { defaultValue: q.type })}
              </Badge>
            </div>

            <p className="font-medium text-surface-900 dark:text-white">{q.question}</p>

            {q.type === 'mcq' && q.options && (
              <ul className="space-y-1.5 text-sm">
                {Object.entries(q.options).map(([key, label]) => {
                  const isCorrect = String(q.correct_answer).toUpperCase() === key;
                  return (
                    <li
                      key={key}
                      className={`flex gap-2 rounded-lg px-3 py-2 ${
                        isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-medium'
                          : 'text-surface-700 dark:text-surface-300'
                      }`}
                    >
                      <span className="font-semibold shrink-0">{key}.</span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {t('aiQuizPage.correctAnswer')}{' '}
              {q.type === 'mcq' && q.correct_answer_label
                ? `${q.correct_answer} — ${q.correct_answer_label}`
                : q.correct_answer}
            </p>

            {q.explanation && (
              <p className="text-xs text-surface-500 border-t border-surface-100 dark:border-surface-800 pt-2">
                <span className="font-semibold">{t('aiQuizPage.explanation')} </span>
                {q.explanation}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
