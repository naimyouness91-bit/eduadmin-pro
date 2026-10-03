import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faCircle,
  faPaperPlane,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import { messagesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { formatTime } from '../../utils/formatTime';
import { SearchBar, Avatar, EmptyState, Button } from '../../components/common/UI';
import { GlassCard, StudentPageShell } from '../../components/student/StudentUI';

export default function Messages() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentMessagesView />;
  return <MessagesAdmin />;
}

function StudentMessagesView() {
  const { t } = useTranslation();
  return (
    <StudentPageShell title={t('messagesPage.title')} subtitle={t('messagesPage.studentSubtitle')}>
      <GlassCard padding={false} className="overflow-hidden">
        <MessagesPanel studentMode />
      </GlassCard>
    </StudentPageShell>
  );
}

function MessagesAdmin() {
  return <MessagesPanel />;
}

function MessagesPanel({ studentMode = false }) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);
  const listRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await messagesAPI.conversations();
      setConversations(data.data ?? []);
    } catch {
      /* silent on poll */
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId, silent = false) => {
    if (!userId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const { data } = await messagesAPI.messages(userId, { per_page: 100 });
      setMessages(data.data ?? []);
    } catch {
      if (!silent) toast.error(t('messagesPage.loadMessagesFailed'));
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [t]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversations();
      if (activeUser?.id) loadMessages(activeUser.id, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadConversations, loadMessages, activeUser?.id]);

  useEffect(() => {
    if (activeUser?.id) {
      loadMessages(activeUser.id);
    } else {
      setMessages([]);
    }
  }, [activeUser?.id, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredConversations = conversations.filter((c) => {
    const name = c.user?.name?.toLowerCase() ?? '';
    return name.includes(search.trim().toLowerCase());
  });

  const handleSend = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeUser?.id || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeUser.id,
      content,
      created_at: new Date().toISOString(),
      sender: currentUser,
      receiver: activeUser,
      _optimistic: true,
    };

    setDraft('');
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      await messagesAPI.send({
        receiver_id: activeUser.id,
        content,
      });
      await loadMessages(activeUser.id, true);
      await loadConversations();
    } catch {
      toast.error(t('messagesPage.sendFailed'));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const showAvatarFor = (msg, index) => {
    if (msg.sender_id === currentUser?.id) return false;
    if (index === 0) return true;
    return messages[index - 1]?.sender_id !== msg.sender_id;
  };

  return (
    <div
      className={`flex flex-col md:flex-row overflow-hidden animate-fade-in min-w-0 ${
        studentMode
          ? 'h-[min(560px,calc(100dvh-240px))] min-h-[360px] bg-transparent'
          : 'h-[min(640px,calc(100dvh-160px))] min-h-[360px] rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-900 shadow-card'
      }`}
    >
      <aside
        className={[
          'w-full md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-surface-200 dark:border-surface-700 flex flex-col min-h-0',
          activeUser ? 'hidden md:flex' : 'flex',
        ].join(' ')}
      >
        <div className="p-4 border-b border-surface-100 dark:border-surface-800">
          {!studentMode && (
            <h2 className="font-display font-bold text-lg text-surface-900 dark:text-white mb-3">
              {t('messagesPage.title')}
            </h2>
          )}
          <SearchBar value={search} onChange={setSearch} placeholder={t('messagesPage.searchContacts')} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
              ))}
            </div>
          ) : filteredConversations.length ? (
            filteredConversations.map((conv) => {
              const contact = conv.user;
              const isActive = activeUser?.id === contact?.id;
              const last = conv.last_message;
              return (
                <button
                  key={contact?.id}
                  type="button"
                  onClick={() => setActiveUser(contact)}
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-surface-50 dark:border-surface-800/50 ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar src={contact?.avatar_url} name={contact?.name} size="sm" />
                    <FontAwesomeIcon
                      icon={faCircle}
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-success-500 bg-white dark:bg-surface-900 rounded-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-medium text-sm text-surface-900 dark:text-white truncate">
                        {contact?.name}
                      </p>
                      <span className="text-[10px] text-surface-400 flex-shrink-0">
                        {formatTime(last?.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 truncate mt-0.5">
                      {last?.content || t('messagesPage.noMessagesYet')}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <p className="text-sm text-surface-400 text-center py-8 px-4">{t('messagesPage.noConversations')}</p>
          )}
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 min-h-0 ${activeUser ? 'flex' : 'hidden md:flex'}`}>
        {!activeUser ? (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <EmptyState
              icon={faEnvelope}
              title={t('messagesPage.selectConversation')}
              description={t('messagesPage.selectConversationHint')}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-surface-100 dark:border-surface-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveUser(null)}
                className="md:hidden p-2 -ms-1 rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                aria-label={t('messagesPage.backToConversations')}
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
              </button>
              <div className="relative">
                <Avatar src={activeUser.avatar_url} name={activeUser.name} size="md" />
                <FontAwesomeIcon
                  icon={faCircle}
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-success-500 bg-white dark:bg-surface-900 rounded-full"
                />
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{activeUser.name}</p>
                <p className="text-xs text-success-500 font-medium">{t('messagesPage.online')}</p>
              </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine = msg.sender_id === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && showAvatarFor(msg, index) ? (
                        <Avatar src={activeUser.avatar_url} name={activeUser.name} size="xs" />
                      ) : !isMine ? (
                        <div className="w-6 flex-shrink-0" />
                      ) : null}
                      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div
                          className={`px-4 py-2.5 text-sm ${
                            isMine
                              ? 'bg-primary-500 text-white rounded-2xl rounded-br-md'
                              : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-2xl rounded-bl-md'
                          } ${msg._optimistic ? 'opacity-70' : ''}`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-surface-400 mt-1 px-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="p-3 sm:p-4 border-t border-surface-100 dark:border-surface-800 flex gap-2 flex-shrink-0"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('messagesPage.typeMessage')}
                className="flex-1 min-w-0 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
              />
              <Button type="submit" disabled={!draft.trim() || sending} icon={faPaperPlane} className="shrink-0">
                <span className="hidden sm:inline">{t('messagesPage.send')}</span>
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
