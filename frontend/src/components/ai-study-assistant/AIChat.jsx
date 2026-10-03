import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faRobot, faUser, faSpinner } from '@fortawesome/free-solid-svg-icons';
import MarkdownMessage from '../ai-exam-prep/MarkdownMessage';
import SuggestedPrompts from './SuggestedPrompts';
import { Badge, Button } from '../common/UI';

export default function AIChat({
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  prompts,
  onPromptSelect,
  aiEnabled,
}) {
  const { t } = useTranslation();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    onSend(draft.trim());
  };

  return (
    <div className="flex flex-col h-full min-h-[320px] sm:min-h-[420px] rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <FontAwesomeIcon icon={faRobot} className="text-primary-500" />
          <span className="font-display font-semibold text-surface-900 dark:text-white">{t('aiStudyPage.studyChat')}</span>
          <Badge color="blue" size="sm">
            {t('aiStudyPage.educationalMode')}
          </Badge>
        </div>
        <span className="text-xs text-surface-500">
          {aiEnabled ? t('aiStudyPage.aiConnected') : t('aiStudyPage.offlineTutorMode')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !sending && (
          <div className="text-center py-6 px-2 space-y-4">
            <p className="text-sm text-surface-600 dark:text-surface-300 max-w-md mx-auto">
              {t('aiStudyPage.welcomeHint')}
            </p>
            <div className="text-left max-w-md mx-auto rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4 space-y-2">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                {t('aiStudyPage.tryAsking')}
              </p>
              <ul className="text-sm text-surface-700 dark:text-surface-200 space-y-1.5 list-disc list-inside">
                <li>{t('aiStudyPage.exampleMiddleware')}</li>
                <li>{t('aiStudyPage.exampleDatabase')}</li>
                <li>{t('aiStudyPage.exampleMathExam')}</li>
                <li>{t('aiStudyPage.exampleSql')}</li>
              </ul>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id ?? `${m.role}-${m.created_at}`}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faRobot} className="text-primary-600 text-sm" />
              </div>
            )}
            <div
              className={`max-w-[min(85%,100%)] rounded-2xl px-3 sm:px-4 py-2.5 ${
                m.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-800'
              }`}
            >
              {m.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              ) : (
                <MarkdownMessage content={m.content} />
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faUser} className="text-surface-600 text-sm" />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex gap-3 items-center text-surface-500 text-sm">
            <FontAwesomeIcon icon={faSpinner} spin />
            {t('aiStudyPage.thinking')}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 sm:p-4 border-t border-surface-200 dark:border-surface-700 space-y-3 bg-surface-50/80 dark:bg-surface-950/50">
        <SuggestedPrompts
          prompts={prompts}
          disabled={sending}
          onSelect={(p) => onPromptSelect(p)}
        />
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={2}
            placeholder={t('aiStudyPage.inputPlaceholder')}
            className="flex-1 min-w-0 resize-none rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={sending || !draft.trim()} className="self-end shrink-0">
            <FontAwesomeIcon icon={faPaperPlane} />
          </Button>
        </form>
      </div>
    </div>
  );
}
