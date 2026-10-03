import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faSpinner } from '@fortawesome/free-solid-svg-icons';
import MarkdownMessage from '../ai-exam-prep/MarkdownMessage';
import { Button } from '../common/UI';

export default function StudyPlanCard({ onGenerate, loading }) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [days, setDays] = useState(7);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = await onGenerate({
      subject: subject.trim() || undefined,
      days,
    });
    if (data?.content) setResult(data);
  };

  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-4 sm:p-5 shadow-sm">
      <h3 className="font-display font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={faCalendarDays} className="text-emerald-500" />
        {t('aiStudyPage.studyPlanTitle')}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('aiStudyPage.focusSubjectPlaceholder')}
          className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
        />
        <label className="block text-xs text-surface-500">
          {t('aiStudyPage.planLengthDays')}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
          >
            {[3, 5, 7, 10, 14].map((n) => (
              <option key={n} value={n}>
                {t('aiStudyPage.daysOption', { count: n })}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
              {t('aiStudyPage.buildingPlan')}
            </>
          ) : (
            t('aiStudyPage.generateStudyPlan')
          )}
        </Button>
      </form>
      {result?.content && (
        <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 max-h-96 overflow-y-auto">
          <MarkdownMessage content={result.content} />
        </div>
      )}
    </div>
  );
}
