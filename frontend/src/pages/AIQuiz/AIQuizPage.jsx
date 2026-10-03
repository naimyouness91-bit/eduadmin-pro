import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardQuestion,
  faPlus,
  faPlay,
  faEye,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '../../store';
import { aiQuizAPI } from '../../services/api';
import { PageHeader, Card, Badge, Button, EmptyState } from '../../components/common/UI';
import QuizGenerator from './QuizGenerator';
import QuestionCard from '../../components/ai-quiz/QuestionCard';
import ScoreCard from '../../components/ai-quiz/ScoreCard';

export default function AIQuizPage() {
  const { hasRole } = useAuthStore();
  const isTeacher = hasRole('teacher');
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const isGenerate = pathname.endsWith('/generate');

  if (isGenerate && isTeacher) {
    return <AIQuizListShell isTeacher={isTeacher} view="generate" />;
  }

  if (id && id !== 'generate') {
    return <QuizTakeOrManage quizId={id} isTeacher={isTeacher} />;
  }

  return <AIQuizListShell isTeacher={isTeacher} view="list" />;
}

function AIQuizListShell({ isTeacher, view }) {
  const { t } = useTranslation();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await aiQuizAPI.listQuizzes({ per_page: 50 });
      setQuizzes(data.data ?? []);
    } catch {
      toast.error(t('aiQuizPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.aiQuiz')}
        subtitle={isTeacher ? t('aiQuizPage.subtitleTeacher') : t('aiQuizPage.subtitleStudent')}
        actions={
          isTeacher ? (
            <Link to="/ai-quiz/generate">
              <Button type="button">
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                {t('aiQuizPage.newQuiz')}
              </Button>
            </Link>
          ) : (
            <Link to="/ai-study">
              <Button type="button" variant="outline">
                {t('nav.aiStudy')}
              </Button>
            </Link>
          )
        }
      />

      {view === 'generate' && isTeacher ? (
        <QuizGenerator />
      ) : (
        <>
          {loading ? (
            <p className="text-sm text-surface-500">{t('aiQuizPage.loadingQuizzes')}</p>
          ) : quizzes.length === 0 ? (
            <EmptyState
              icon={faClipboardQuestion}
              title={t('aiQuizPage.noQuizzesYet')}
              description={
                isTeacher
                  ? t('aiQuizPage.emptyTeacher')
                  : t('aiQuizPage.emptyStudent')
              }
              action={
                isTeacher ? (
                  <Link to="/ai-quiz/generate">
                    <Button type="button">{t('aiQuizPage.createQuiz')}</Button>
                  </Link>
                ) : null
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {quizzes.map((q) => (
                <Card key={q.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-surface-900 dark:text-white line-clamp-2">
                      {q.title}
                    </h3>
                    <Badge
                      color={q.status === 'published' ? 'success' : 'gray'}
                      size="sm"
                    >
                      {t(`aiQuizPage.statuses.${q.status}`, { defaultValue: q.status })}
                    </Badge>
                  </div>
                  <p className="text-xs text-surface-500">{q.course_name}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge color="info" size="sm">
                      {q.difficulty}
                    </Badge>
                    <Badge color="gray" size="sm">
                      {t('aiQuizPage.questionsCount', { count: q.question_count })}
                    </Badge>
                  </div>
                  {q.my_attempt && (
                    <p className="text-sm text-primary-600 dark:text-primary-300">
                      {t('aiQuizPage.scoreLine', {
                        score: q.my_attempt.score,
                        max: q.my_attempt.max_score,
                        pct: q.my_attempt.percentage,
                      })}
                    </p>
                  )}
                  <div className="mt-auto flex gap-2">
                    <Link to={`/ai-quiz/${q.id}`} className="flex-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={q.my_attempt ? 'outline' : 'primary'}
                        className="w-full"
                      >
                        <FontAwesomeIcon icon={q.my_attempt ? faEye : faPlay} className="me-1" />
                        {q.my_attempt ? t('common.view') : t('aiQuizPage.start')}
                      </Button>
                    </Link>
                    {q.my_attempt && (
                      <Link to={`/ai-quiz/${q.id}/result/${q.my_attempt.id}`}>
                        <Button type="button" size="sm" variant="ghost">
                          {t('aiQuizPage.results')}
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QuizTakeOrManage({ quizId, isTeacher }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await aiQuizAPI.getQuiz(quizId);
      setQuiz(data.data);
      if (data.data.my_attempt) {
        setResult(data.data.my_attempt);
      }
      if (isTeacher) {
        const attemptsRes = await aiQuizAPI.listAttempts(quizId, { per_page: 50 });
        setAttempts(attemptsRes.data.data ?? []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('aiQuizPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [quizId, isTeacher, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePublish = async () => {
    try {
      const { data } = await aiQuizAPI.publish(quizId);
      toast.success(data.message || t('aiQuizPage.published'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('aiQuizPage.publishFailed'));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        answers: (quiz.questions ?? []).map((q) => ({
          question_id: q.id,
          answer: answers[q.id] ?? '',
        })),
      };
      const { data } = await aiQuizAPI.submit(quizId, payload);
      toast.success(t('aiQuizPage.quizSubmitted'));
      navigate(`/ai-quiz/${quizId}/result/${data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('aiQuizPage.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-surface-500 py-8 text-center">{t('aiQuizPage.loadingQuiz')}</p>;
  }

  if (!quiz) {
    return (
      <EmptyState
        icon={faClipboardQuestion}
        title={t('aiQuizPage.quizNotFound')}
        action={
          <Link to="/ai-quiz">
            <Button type="button">{t('common.back')}</Button>
          </Link>
        }
      />
    );
  }

  if (isTeacher) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Link to="/ai-quiz">
          <Button type="button" variant="ghost" size="sm">
            ← {t('common.back')}
          </Button>
        </Link>
        <PageHeader title={quiz.title} subtitle={quiz.course_name} />
        <div className="flex flex-wrap gap-2">
          <Badge color="info">{quiz.difficulty}</Badge>
          <Badge color="gray">
            {t(`aiQuizPage.statuses.${quiz.status}`, { defaultValue: quiz.status })}
          </Badge>
          {quiz.status !== 'published' && (
            <Button size="sm" onClick={handlePublish}>
              {t('aiQuizPage.publishForStudents')}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {(quiz.questions ?? []).map((q, i) => (
            <div
              key={q.id}
              className="rounded-2xl border border-surface-200 dark:border-surface-700 p-4 text-sm space-y-2"
            >
              <div className="flex flex-wrap gap-2 items-center">
                <p className="font-medium">
                  Q{i + 1}. {q.question}
                </p>
                <Badge color="gray" size="sm">
                  {t(`aiQuizPage.questionTypes.${q.type}`, { defaultValue: q.type })}
                </Badge>
              </div>
              {q.type === 'mcq' && q.options && (
                <ul className="text-surface-600 dark:text-surface-400 space-y-1 ps-2">
                  {Object.entries(q.options).map(([key, label]) => (
                    <li key={key} className={String(q.correct_answer).toUpperCase() === key ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                      {key}. {label}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-emerald-600 dark:text-emerald-400">
                {t('aiQuizPage.correctAnswer')}{' '}
                {q.type === 'mcq' && q.options?.[q.correct_answer]
                  ? `${q.correct_answer} — ${q.options[q.correct_answer]}`
                  : q.correct_answer}
              </p>
              {q.explanation && (
                <p className="text-xs text-surface-500">{t('aiQuizPage.explanation')} {q.explanation}</p>
              )}
            </div>
          ))}
        </div>

        {quiz.status === 'published' && (
          <Card className="p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-3">{t('aiQuizPage.studentResults')}</h3>
            {attempts.length === 0 ? (
              <p className="text-sm text-surface-500">{t('aiQuizPage.noAttemptsYet')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-surface-500">
                    <tr>
                      <th className="text-start py-2 font-medium">{t('aiQuizPage.columnStudent')}</th>
                      <th className="text-start py-2 font-medium">{t('aiQuizPage.columnScore')}</th>
                      <th className="text-start py-2 font-medium">{t('aiQuizPage.columnSubmitted')}</th>
                      <th className="text-end py-2 font-medium">{t('aiQuizPage.columnReview')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-t border-surface-100 dark:border-surface-800">
                        <td className="py-2">{attempt.student_name ?? t('aiQuizPage.studentFallback')}</td>
                        <td className="py-2">
                          {attempt.score}/{attempt.max_score} ({attempt.percentage}%)
                        </td>
                        <td className="py-2 text-surface-500">
                          {attempt.submitted_at
                            ? new Date(attempt.submitted_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2 text-end">
                          <Link to={`/ai-quiz/${quizId}/result/${attempt.id}`}>
                            <Button type="button" size="sm" variant="ghost">
                              {t('common.view')}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  if (result && !submitting) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <ScoreCard
          result={result}
          onBack={() => navigate('/ai-quiz')}
        />
        <Link to={`/ai-quiz/${quizId}/result/${result.id}`}>
          <Button type="button">{t('aiQuizPage.fullReview')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/ai-quiz">
        <Button type="button" variant="ghost" size="sm">
          ← {t('common.back')}
        </Button>
      </Link>
      <PageHeader title={quiz.title} subtitle={`${quiz.course_name} · ${quiz.difficulty}`} />
      <div className="space-y-4">
        {(quiz.questions ?? []).map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            value={answers[q.id]}
            onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
            disabled={submitting}
          />
        ))}
      </div>
      <Button onClick={handleSubmit} loading={submitting} className="w-full">
        <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
        {t('aiQuizPage.submitQuiz')}
      </Button>
    </div>
  );
}
