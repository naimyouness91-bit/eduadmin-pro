import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardQuestion, faSpinner } from '@fortawesome/free-solid-svg-icons';
import MarkdownMessage from '../ai-exam-prep/MarkdownMessage';
import { Button } from '../common/UI';

export default function QuizGenerator({ onGenerate, loading }) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const data = await onGenerate({ topic: topic.trim(), count });
    if (data?.content) setResult(data);
  };

  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-4 sm:p-5 shadow-sm">
      <h3 className="font-display font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={faClipboardQuestion} className="text-violet-500" />
        Quiz generator
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (e.g. Laravel Middleware)"
          className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
          required
        />
        <label className="block text-xs text-surface-500">
          Number of questions
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={loading || !topic.trim()}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
              Generating…
            </>
          ) : (
            'Generate quiz'
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
