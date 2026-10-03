import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot,
  faPaperPlane,
  faPlus,
  faTrash,
  faMagnifyingGlass,
  faWandMagicSparkles,
  faBookOpen,
} from '@fortawesome/free-solid-svg-icons';
import { aiExamPrepAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { StudentPageShell, GlassCard } from '../../components/student/StudentUI';
import { Button, SearchBar, Badge } from '../../components/common/UI';
import MarkdownMessage from '../../components/ai-exam-prep/MarkdownMessage';
import { timeAgo } from '../../utils/timeAgo';

export default function ExamPrepCenter() {
  const { hasRole } = useAuthStore();
  if (!hasRole('student')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ExamPrepChat />;
}

function ExamPrepChat() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);

  const endRef = useRef(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await aiExamPrepAPI.conversations({
        per_page: 50,
        search: historySearch.trim() || undefined,
      });
      setConversations(data.data ?? []);
    } catch {
      toast.error(t('examPrepPage.loadConversationsFailed'));
    } finally {
      setLoadingList(false);
    }
  }, [historySearch, t]);

  const loadPrompts = useCallback(async () => {
    try {
      const [promptRes, weakRes] = await Promise.all([
        aiExamPrepAPI.suggestedPrompts(),
        aiExamPrepAPI.weakSubjects(),
      ]);
      setPrompts(promptRes.data.data ?? []);
      setAiEnabled(!!promptRes.data.ai_enabled);
      setWeakSubjects(weakRes.data.data ?? []);
    } catch {
      /* optional sidebar data */
    }
  }, []);

  const loadConversation = useCallback(async (id) => {
    if (!id) {
      setMessages([]);
      return;
    }
    setLoadingChat(true);
    try {
      const { data } = await aiExamPrepAPI.getConversation(id);
      setMessages(data.data?.messages ?? []);
      setActiveId(id);
    } catch {
      toast.error(t('examPrepPage.loadConversationFailed'));
    } finally {
      setLoadingChat(false);
    }
  }, [t]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    const timer = setTimeout(loadConversations, 300);
    return () => clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const startNewChat = async () => {
    try {
      const { data } = await aiExamPrepAPI.createConversation({ title: t('examPrepPage.newStudySession') });
      const conv = data.data;
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
      setDraft('');
    } catch {
      toast.error(t('examPrepPage.startChatFailed'));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await aiExamPrepAPI.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      toast.success(t('examPrepPage.conversationDeleted'));
    } catch {
      toast.error(t('examPrepPage.deleteFailed'));
    }
  };

  const sendMessage = async (content, promptType = null) => {
    const text = (content ?? draft).trim();
    if (!text || sending) return;

    let convId = activeId;

    if (!convId) {
      try {
        const { data } = await aiExamPrepAPI.createConversation({
          title: text.slice(0, 60),
        });
        convId = data.data.id;
        setActiveId(convId);
        setConversations((prev) => [data.data, ...prev]);
      } catch {
        toast.error(t('examPrepPage.createConversationFailed'));
        return;
      }
    }

    const tempUser = {
      id: `temp-u-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);
    setDraft('');
    setSending(true);

    try {
      const { data } = await aiExamPrepAPI.sendMessage(convId, {
        content: text,
        prompt_type: promptType,
      });
      const { user_message, assistant_message } = data.data;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUser.id),
        user_message,
        assistant_message,
      ]);
      loadConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
      toast.error(t('examPrepPage.aiRespondFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <StudentPageShell
      title={t('examPrepPage.title')}
      subtitle={t('examPrepPage.subtitle')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 lg:min-h-[calc(100vh-12rem)]">
        <GlassCard className="lg:col-span-4 xl:col-span-3 flex flex-col p-0 overflow-hidden max-h-[70vh] lg:max-h-none">
          <div className="p-3 border-b border-surface-200/80 dark:border-surface-700/80 space-y-2">
            <Button size="sm" className="w-full" onClick={startNewChat}>
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 me-2" />
              {t('examPrepPage.newChat')}
            </Button>
            <SearchBar
              value={historySearch}
              onChange={setHistorySearch}
              placeholder={t('examPrepPage.searchConversations')}
              className="text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingList ? (
              <p className="text-xs text-surface-500 p-3 text-center">{t('examPrepPage.loading')}</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-surface-500 p-3 text-center">{t('examPrepPage.noConversations')}</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadConversation(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && loadConversation(c.id)}
                  className={`w-full text-start rounded-xl px-3 py-2.5 text-sm transition-colors group cursor-pointer ${
                    activeId === c.id
                      ? 'bg-primary-500/15 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-surface-100 dark:hover:bg-surface-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium line-clamp-2">{c.title || t('examPrepPage.studySession')}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-danger-500 shrink-0"
                      aria-label={t('examPrepPage.delete')}
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs text-surface-500">{timeAgo(c.updated_at)}</span>
                </div>
              ))
            )}
          </div>
          {weakSubjects.length > 0 && (
            <div className="p-3 border-t border-surface-200/80 dark:border-surface-700/80">
              <p className="text-xs font-semibold text-surface-500 mb-2">{t('examPrepPage.weakSubjects')}</p>
              <div className="flex flex-wrap gap-1">
                {weakSubjects.slice(0, 4).map((w) => (
                  <Badge key={w.course} color={w.priority === 'high' ? 'danger' : 'warning'} size="xs">
                    {w.course}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-8 xl:col-span-9 flex flex-col p-0 overflow-hidden min-h-[360px] sm:min-h-[480px]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-200/80 dark:border-surface-700/80">
            <div className="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <FontAwesomeIcon icon={faRobot} className="text-primary-500 w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-surface-900 dark:text-white text-sm">{t('examPrepPage.aiTutor')}</p>
              <p className="text-xs text-surface-500 truncate">
                {aiEnabled ? t('examPrepPage.poweredByOpenAI') : t('examPrepPage.offlineMode')}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingChat ? (
              <p className="text-center text-surface-500 text-sm py-12">{t('examPrepPage.loadingChat')}</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 px-4">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-10 h-10 text-primary-400 mb-4" />
                <h3 className="font-display font-bold text-lg text-surface-900 dark:text-white mb-2">
                  {t('examPrepPage.readyForExams')}
                </h3>
                <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
                  {t('examPrepPage.emptyHint')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-start">
                  {prompts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => sendMessage(p.prompt, p.id)}
                      disabled={sending}
                      className="rounded-xl border border-surface-200 dark:border-surface-700 px-3 py-2.5 text-sm hover:border-primary-400 hover:bg-primary-500/5 transition-colors text-start"
                    >
                      <FontAwesomeIcon icon={faBookOpen} className="w-3.5 h-3.5 text-primary-500 me-2" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.role === 'user'
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-surface-100 dark:bg-surface-800 rounded-bl-md'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <MarkdownMessage content={m.content} />
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-surface-100 dark:bg-surface-800 rounded-2xl px-4 py-3 text-sm text-surface-500">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="animate-pulse me-2" />
                  {t('examPrepPage.thinking')}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length > 0 && prompts.length > 0 && (
            <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-thin">
              {prompts.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={sending}
                  onClick={() => sendMessage(p.prompt, p.id)}
                  className="shrink-0 text-xs rounded-full border border-surface-200 dark:border-surface-700 px-3 py-1 hover:bg-primary-500/10"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-surface-200/80 dark:border-surface-700/80 flex gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('examPrepPage.askPlaceholder')}
              disabled={sending}
              className="flex-1 min-w-0 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
            <Button type="submit" disabled={sending || !draft.trim()}>
              <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
            </Button>
          </form>
        </GlassCard>
      </div>
    </StudentPageShell>
  );
}
