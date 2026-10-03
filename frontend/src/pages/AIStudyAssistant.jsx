import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBrain,
  faPlus,
  faComments,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '../store';
import { aiStudyAPI } from '../services/api';
import { StudentPageShell, GlassCard } from '../components/student/StudentUI';
import { Badge, Button } from '../components/common/UI';
import AIChat from '../components/ai-study-assistant/AIChat';
import QuizGenerator from '../components/ai-study-assistant/QuizGenerator';
import StudyPlanCard from '../components/ai-study-assistant/StudyPlanCard';
import SummaryCard from '../components/ai-study-assistant/SummaryCard';
import { timeAgo } from '../utils/timeAgo';

export default function AIStudyAssistant() {
  const { hasRole } = useAuthStore();
  if (!hasRole('student')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <StudyAssistantPage />;
}

function StudyAssistantPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('chat');
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [toolLoading, setToolLoading] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadPrompts = useCallback(async () => {
    try {
      const { data } = await aiStudyAPI.suggestedPrompts();
      setPrompts(data.data ?? []);
      setAiEnabled(!!data.ai_enabled);
    } catch {
      /* optional */
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data } = await aiStudyAPI.conversations({ per_page: 40 });
      setConversations(data.data ?? []);
    } catch {
      toast.error(t('aiStudyPage.loadHistoryFailed'));
    } finally {
      setLoadingHistory(false);
    }
  }, [t]);

  const loadConversation = useCallback(async (id) => {
    if (!id) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    try {
      const { data } = await aiStudyAPI.getConversation(id);
      setMessages(data.data?.messages ?? []);
      setConversationId(id);
      setTab('chat');
    } catch {
      toast.error(t('aiStudyPage.loadConversationFailed'));
    }
  }, [t]);

  useEffect(() => {
    loadPrompts();
    loadConversations();
  }, [loadPrompts, loadConversations]);

  const sendChat = async (text, promptType = null) => {
    setSending(true);
    setDraft('');
    const optimistic = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await aiStudyAPI.chat({
        message: text,
        conversation_id: conversationId ?? undefined,
        prompt_type: promptType ?? undefined,
      });
      const payload = data.data;
      setConversationId(payload.conversation_id);
      setMessages(payload.messages ?? []);
      loadConversations();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      const msg = err.response?.data?.message;
      toast.error(msg || t('aiStudyPage.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handlePromptSelect = (p) => {
    setDraft(p.prompt);
    setTab('chat');
    sendChat(p.prompt, p.id);
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setDraft('');
    setTab('chat');
  };

  const runSummary = async (body) => {
    setToolLoading(true);
    try {
      const { data } = await aiStudyAPI.summary(body);
      if (data.data?.conversation_id) {
        setConversationId(data.data.conversation_id);
        loadConversations();
      }
      return data.data;
    } catch (err) {
      toast.error(err.response?.data?.message || t('aiStudyPage.summaryFailed'));
      return null;
    } finally {
      setToolLoading(false);
    }
  };

  const runQuiz = async (body) => {
    setToolLoading(true);
    try {
      const { data } = await aiStudyAPI.quiz(body);
      if (data.data?.conversation_id) {
        setConversationId(data.data.conversation_id);
        loadConversations();
      }
      return data.data;
    } catch (err) {
      toast.error(err.response?.data?.message || t('aiStudyPage.quizFailed'));
      return null;
    } finally {
      setToolLoading(false);
    }
  };

  const runStudyPlan = async (body) => {
    setToolLoading(true);
    try {
      const { data } = await aiStudyAPI.studyPlan(body);
      if (data.data?.conversation_id) {
        setConversationId(data.data.conversation_id);
        loadConversations();
      }
      return data.data;
    } catch (err) {
      toast.error(err.response?.data?.message || t('aiStudyPage.studyPlanFailed'));
      return null;
    } finally {
      setToolLoading(false);
    }
  };

  const tabs = [
    { id: 'chat', label: t('aiStudyPage.tabChat'), icon: faComments },
    { id: 'summary', label: t('aiStudyPage.tabSummary'), icon: faWandMagicSparkles },
    { id: 'quiz', label: t('aiStudyPage.tabQuiz'), icon: faBrain },
    { id: 'plan', label: t('aiStudyPage.tabStudyPlan'), icon: faBrain },
  ];

  return (
    <StudentPageShell
      title={t('aiStudyPage.title')}
      subtitle={t('aiStudyPage.subtitle')}
      icon={faBrain}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <aside className="lg:col-span-3 space-y-3">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                {t('aiStudyPage.messageHistory')}
              </h2>
              <Button size="sm" variant="ghost" onClick={startNewChat}>
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                {t('aiStudyPage.new')}
              </Button>
            </div>
            {loadingHistory ? (
              <p className="text-xs text-surface-500">{t('aiStudyPage.loading')}</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-surface-500">{t('aiStudyPage.noChats')}</p>
            ) : (
              <ul className="space-y-1 max-h-64 lg:max-h-[32rem] overflow-y-auto">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => loadConversation(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                        conversationId === c.id
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200'
                          : 'hover:bg-surface-100 dark:hover:bg-surface-800'
                      }`}
                    >
                      <span className="line-clamp-1 font-medium">{c.title || t('aiStudyPage.studySession')}</span>
                      <span className="text-xs text-surface-500">
                        {timeAgo(c.updated_at)} · {t('aiStudyPage.messagesCount', { count: c.messages_count ?? 0 })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
          <GlassCard className="p-4 hidden sm:block space-y-2">
            <Badge color="blue" size="sm">
              {t('aiStudyPage.educationalMode')}
            </Badge>
            <Badge color={aiEnabled ? 'green' : 'gray'} size="sm">
              {aiEnabled ? t('aiStudyPage.openAiEnabled') : t('aiStudyPage.offlineMode')}
            </Badge>
            <p className="text-xs text-surface-500">
              {t('aiStudyPage.eduModeHint')}
            </p>
            <Link
              to="/ai-quiz"
              className="inline-flex text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t('aiStudyPage.courseFileQuizzes')}
            </Link>
          </GlassCard>
        </aside>

        <main className="lg:col-span-9 space-y-4">
          <div className="responsive-tabs gap-2 p-0 bg-transparent">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setTab(tabItem.id)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 flex-shrink-0 ${
                  tab === tabItem.id
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700'
                }`}
              >
                <FontAwesomeIcon icon={tabItem.icon} />
                {tabItem.label}
              </button>
            ))}
          </div>

          {tab === 'chat' && (
            <AIChat
              messages={messages}
              draft={draft}
              onDraftChange={setDraft}
              onSend={sendChat}
              sending={sending}
              prompts={prompts}
              onPromptSelect={handlePromptSelect}
              aiEnabled={aiEnabled}
            />
          )}

          {tab === 'summary' && (
            <SummaryCard onGenerate={runSummary} loading={toolLoading} />
          )}

          {tab === 'quiz' && (
            <QuizGenerator onGenerate={runQuiz} loading={toolLoading} />
          )}

          {tab === 'plan' && (
            <StudyPlanCard onGenerate={runStudyPlan} loading={toolLoading} />
          )}
        </main>
      </div>
    </StudentPageShell>
  );
}
