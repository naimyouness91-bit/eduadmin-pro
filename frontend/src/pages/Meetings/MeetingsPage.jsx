import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faVideo } from '@fortawesome/free-solid-svg-icons';
import { meetingsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { PageHeader, Button, SearchBar } from '../../components/common/UI';
import MeetingCard from '../../components/meetings/MeetingCard';
import MeetingCalendar from '../../components/meetings/MeetingCalendar';

export default function MeetingsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuthStore();
  const canCreate = hasRole('super_admin', 'admin', 'teacher');

  const [meetings, setMeetings] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, calRes] = await Promise.all([
        meetingsAPI.list({ per_page: 50 }),
        meetingsAPI.calendar({
          from: new Date().toISOString(),
          to: new Date(Date.now() + 90 * 86400000).toISOString(),
        }),
      ]);
      setMeetings(listRes.data.data ?? []);
      setCalendar(calRes.data.data ?? []);
    } catch {
      toast.error(t('meetingsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) => m.title?.toLowerCase().includes(q) || m.course?.name?.toLowerCase().includes(q)
    );
  }, [meetings, search]);

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success(t('meetingsPage.linkCopied'));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.meetings')}
        subtitle={t('meetingsPage.subtitle')}
        actions={
          canCreate ? (
            <Link to="/meetings/schedule">
              <Button>
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                {t('meetingsPage.scheduleMeeting')}
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t('meetingsPage.searchPlaceholder')} className="flex-1" />
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('list')}>
            {t('meetingsPage.viewList')}
          </Button>
          <Button variant={view === 'calendar' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('calendar')}>
            {t('meetingsPage.viewCalendar')}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-surface-500 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faVideo} />
          {t('meetingsPage.loadingMeetings')}
        </p>
      ) : view === 'calendar' ? (
        <MeetingCalendar events={calendar} />
      ) : filtered.length === 0 ? (
        <p className="text-surface-500 text-sm">{t('meetingsPage.noMeetingsFound')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <MeetingCard key={m.id} meeting={m} onCopyLink={copyLink} />
          ))}
        </div>
      )}
    </div>
  );
}
