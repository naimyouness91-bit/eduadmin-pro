import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faHand,
  faHandPaper,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { meetingsAPI } from '../../services/api';
import { Button, Card } from '../../components/common/UI';
import MeetingChat from '../../components/meetings/MeetingChat';
import ParticipantsList from '../../components/meetings/ParticipantsList';

function loadJitsiScript(domain) {
  const src = `https://${domain}/external_api.js`;
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      if (existing.readyState === 'complete' || existing.readyState === 'loaded') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function MeetingRoom() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const jitsiRef = useRef(null);
  const apiRef = useRef(null);

  const [joinData, setJoinData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [resources, setResources] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSide = useCallback(async () => {
    try {
      const [pRes, mRes, rRes] = await Promise.all([
        meetingsAPI.participants(id),
        meetingsAPI.messages(id, { per_page: 100 }),
        meetingsAPI.resources(id),
      ]);
      setParticipants(pRes.data.data ?? []);
      setMessages(mRes.data.data ?? []);
      setResources(rRes.data.data ?? []);
    } catch {
      /* polling */
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await meetingsAPI.join(id);
        if (!mounted) return;
        setJoinData(data.data);
        setHandRaised(false);
        await loadJitsiScript(data.data.jitsi.domain);
        if (!mounted || !jitsiRef.current) return;

        const { jitsi } = data.data;
        apiRef.current = new window.JitsiMeetExternalAPI(jitsi.domain, {
          roomName: jitsi.room_name,
          parentNode: jitsiRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: jitsi.user_display_name,
            email: jitsi.user_email,
          },
          configOverwrite: jitsi.config,
          interfaceConfigOverwrite: jitsi.interface_config,
        });

        apiRef.current.addListener('videoConferenceLeft', () => {
          meetingsAPI.leave(id).catch(() => {});
          navigate(`/meetings/${id}`);
        });
      } catch (err) {
        toast.error(err.response?.data?.message || t('meetingsPage.cannotJoin'));
        navigate('/meetings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
      meetingsAPI.leave(id).catch(() => {});
    };
  }, [id, navigate, t]);

  useEffect(() => {
    loadSide();
    const interval = setInterval(loadSide, 5000);
    return () => clearInterval(interval);
  }, [loadSide]);

  const sendChat = async (text) => {
    setSending(true);
    try {
      await meetingsAPI.sendMessage(id, { content: text });
      setChatDraft('');
      loadSide();
    } catch {
      toast.error(t('meetingsPage.messageFailed'));
    } finally {
      setSending(false);
    }
  };

  const toggleHand = async () => {
    const next = !handRaised;
    try {
      await meetingsAPI.raiseHand(id, { raised: next });
      setHandRaised(next);
      loadSide();
    } catch {
      toast.error(t('meetingsPage.handUpdateFailed'));
    }
  };

  const downloadResource = async (resource) => {
    try {
      await meetingsAPI.downloadResource(id, resource.id, resource.file_name);
    } catch {
      toast.error(t('groupsPage.downloadFailed'));
    }
  };

  if (loading) {
    return <p className="p-8 text-surface-500">{t('meetingsPage.connecting')}</p>;
  }

  return (
    <div className="min-h-[480px] h-[min(720px,calc(100dvh-6rem))] flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <Link to={`/meetings/${id}`} className="text-surface-500 hover:text-primary-600 flex items-center gap-2 text-sm shrink-0">
          <FontAwesomeIcon icon={faArrowLeft} />
          {t('common.back')}
        </Link>
        <h1 className="font-display font-semibold truncate min-w-0 flex-1 text-center sm:text-start order-3 sm:order-none w-full sm:w-auto">{joinData?.meeting?.title}</h1>
        <Button size="sm" variant={handRaised ? 'primary' : 'ghost'} onClick={toggleHand} className="shrink-0">
          <FontAwesomeIcon icon={handRaised ? faHand : faHandPaper} className="me-1" />
          {handRaised ? t('meetingsPage.lowerHand') : t('meetingsPage.raiseHand')}
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 min-h-0">
        <div className="lg:col-span-3 rounded-2xl overflow-hidden bg-surface-900 min-h-[320px]">
          <div ref={jitsiRef} className="w-full h-full min-h-[320px]" />
        </div>

        <div className="lg:col-span-1 flex flex-col gap-3 min-h-0">
          <Card className="p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold mb-2">{t('meetingsPage.participants')}</h3>
            <ParticipantsList participants={participants} />
          </Card>

          <Card padding={false} className="flex-1 min-h-[200px] overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold p-3 pb-0">{t('meetingsPage.sessionChat')}</h3>
            <MeetingChat
              messages={messages}
              draft={chatDraft}
              onDraftChange={setChatDraft}
              onSend={sendChat}
              sending={sending}
            />
          </Card>

          {resources.length > 0 && (
            <Card className="p-3">
              <h3 className="text-sm font-semibold mb-2">{t('meetingsPage.resources')}</h3>
              <ul className="space-y-1">
                {resources.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => downloadResource(r)}
                      className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      {r.file_name}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
