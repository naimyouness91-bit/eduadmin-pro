import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faPlus,
  faPenToSquare,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { announcementsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import StudentAnnouncements from '../student/StudentAnnouncements';
import { timeAgo } from '../../utils/timeAgo';
import {
  PageHeader,
  SearchBar,
  Card,
  Badge,
  Avatar,
  Button,
  EmptyState,
  ConfirmDialog,
} from '../../components/common/UI';
import AnnouncementFormModal from '../../components/announcements/AnnouncementFormModal';

export default function Announcements() {
  const { hasRole } = useAuthStore();
  if (hasRole('student')) return <StudentAnnouncements />;
  return <AnnouncementsAdmin />;
}

function AnnouncementsAdmin() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const roleLabel = (role) => {
    if (!role) return t('announcementsPage.everyone');
    return t(`roles.${role}`, { defaultValue: role });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await announcementsAPI.list({ per_page: 100 });
      setAnnouncements(data.data ?? []);
    } catch {
      toast.error(t('announcementsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return announcements;
    return announcements.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q)
    );
  }, [announcements, search]);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto lg:max-w-none">
      <PageHeader
        title={t('announcementsPage.title')}
        subtitle={t('announcementsPage.subtitle')}
        actions={
          isAdmin ? (
            <Button icon={faPlus} onClick={() => { setEditing(null); setModalOpen(true); }}>
              {t('announcementsPage.newAnnouncement')}
            </Button>
          ) : null
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('announcementsPage.searchPlaceholder')}
        className="max-w-md"
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="space-y-4">
          {filtered.map((ann) => {
            const isWarning = ann.target_role && ann.target_role !== 'student';
            return (
              <Card key={ann.id} className="group relative" padding={false}>
                <div className="p-6">
                  <div className="flex gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isWarning
                          ? 'bg-warning-500/15 text-warning-600 dark:text-warning-400'
                          : 'bg-primary-500/15 text-primary-600 dark:text-primary-400'
                      }`}
                    >
                      <FontAwesomeIcon icon={faBullhorn} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-surface-900 dark:text-white">
                          {ann.title}
                        </h3>
                        <Badge color={isWarning ? 'warning' : 'primary'} size="xs">
                          {roleLabel(ann.target_role)}
                        </Badge>
                        {!ann.is_published && (
                          <Badge color="gray" size="xs">{t('announcementsPage.draft')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-3">
                        {ann.content}
                      </p>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                        <Avatar
                          src={ann.creator?.avatar_url}
                          name={ann.creator?.name}
                          size="xs"
                        />
                        <span className="text-xs text-surface-500">
                          {ann.creator?.name || t('announcementsPage.adminFallback')}
                          <span className="mx-1">·</span>
                          {timeAgo(ann.published_at || ann.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => { setEditing(ann); setModalOpen(true); }}
                      className="p-2 rounded-lg bg-white/90 dark:bg-surface-800 text-surface-500 hover:text-primary-500 shadow-sm"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ann)}
                      className="p-2 rounded-lg bg-white/90 dark:bg-surface-800 text-surface-500 hover:text-danger-500 shadow-sm"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={faBullhorn}
          title={t('announcementsPage.noAnnouncements')}
          description={
            search
              ? t('announcementsPage.emptySearch')
              : t('announcementsPage.empty')
          }
          action={
            isAdmin && !search ? (
              <Button icon={faPlus} onClick={() => setModalOpen(true)}>
                {t('announcementsPage.createAnnouncement')}
              </Button>
            ) : null
          }
        />
      )}

      <AnnouncementFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        announcement={editing}
        onSuccess={load}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const { data } = await announcementsAPI.delete(deleteTarget.id);
            toast.success(data.message || t('announcementsPage.deleted'));
            setDeleteTarget(null);
            load();
          } catch {
            toast.error(t('announcementsPage.deleteFailed'));
          } finally {
            setDeleting(false);
          }
        }}
        title={t('announcementsPage.deleteTitle')}
        message={t('announcementsPage.deleteConfirm', { title: deleteTarget?.title })}
        loading={deleting}
      />
    </div>
  );
}
