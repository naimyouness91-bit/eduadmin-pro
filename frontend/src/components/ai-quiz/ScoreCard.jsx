import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../common/UI';

export default function ScoreCard({ result, onReview, onBack }) {
  const { t } = useTranslation();

  if (!result) return null;

  const pct = result.percentage ?? 0;
  const color =
    pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-gradient-to-br from-primary-50 to-violet-50 dark:from-surface-900 dark:to-surface-800 p-6 text-center shadow-sm space-y-4">
      <FontAwesomeIcon icon={faTrophy} className={`text-4xl ${color}`} />
      <div>
        <p className="text-sm text-surface-500">{t('aiQuizPage.yourScore')}</p>
        <p className={`text-4xl font-display font-bold ${color}`}>
          {result.score}/{result.max_score}
        </p>
        <p className="text-lg font-medium text-surface-700 dark:text-surface-200">
          {pct}%
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {onReview && (
          <Button variant="outline" onClick={onReview}>
            <FontAwesomeIcon icon={faRotateRight} className="me-2" />
            {t('aiQuizPage.reviewAnswers')}
          </Button>
        )}
        {onBack && (
          <Button onClick={onBack}>{t('aiQuizPage.backToQuizzes')}</Button>
        )}
      </div>
    </div>
  );
}
