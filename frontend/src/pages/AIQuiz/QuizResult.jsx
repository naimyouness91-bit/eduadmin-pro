import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { aiQuizAPI } from '../../services/api';
import ScoreCard from '../../components/ai-quiz/ScoreCard';
import QuestionCard from '../../components/ai-quiz/QuestionCard';
import { Button, EmptyState } from '../../components/common/UI';

export default function QuizResult() {
  const { t } = useTranslation();
  const { id, attemptId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await aiQuizAPI.getAttempt(id, attemptId);
        setResult(data.data);
      } catch {
        toast.error(t('aiQuizPage.loadResultsFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, attemptId, t]);

  if (loading) {
    return <p className="text-sm text-surface-500 py-8 text-center">{t('aiQuizPage.loadingResults')}</p>;
  }

  if (!result) {
    return (
      <EmptyState
        title={t('aiQuizPage.resultNotFound')}
        description={t('aiQuizPage.resultNotFoundDesc')}
        action={
          <Link to="/ai-quiz">
            <Button type="button">{t('aiQuizPage.backToQuizzes')}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ScoreCard
        result={result}
        onReview={() => setShowReview((v) => !v)}
        onBack={() => navigate('/ai-quiz')}
      />
      <div className="flex justify-end">
        <Link to="/ai-quiz">
          <Button type="button" variant="outline">
            {t('aiQuizPage.backToQuizzes')}
          </Button>
        </Link>
      </div>

      {showReview && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-surface-900 dark:text-white">
            {t('aiQuizPage.answerReview')}
          </h3>
          {(result.answers ?? []).map((a, i) => (
            <QuestionCard
              key={a.question_id}
              question={{
                id: a.question_id,
                type: a.type,
                question: a.question,
                options: a.options,
              }}
              index={i}
              showReview
              reviewData={a}
            />
          ))}
        </div>
      )}
    </div>
  );
}
