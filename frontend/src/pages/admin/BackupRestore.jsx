import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faDownload,
  faRotateLeft,
  faPlus,
  faTrash,
  faHardDrive,
} from '@fortawesome/free-solid-svg-icons';
import { backupsAPI } from '../../services/api';
import { PageHeader, Card, Button, Badge, ConfirmDialog } from '../../components/common/UI';
import { timeAgo } from '../../utils/timeAgo';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function BackupRestore() {
  const { t } = useTranslation();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [includeFiles, setIncludeFiles] = useState(true);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const uploadRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await backupsAPI.list({ per_page: 50 });
      setBackups(data.data ?? []);
    } catch {
      toast.error(t('adminPages.backupRestore.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await backupsAPI.create({ include_files: includeFiles });
      toast.success(data.message || t('adminPages.backupRestore.created'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('adminPages.backupRestore.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backup) => {
    try {
      await backupsAPI.download(backup.id, backup.filename);
      toast.success(t('adminPages.backupRestore.downloadStarted'));
    } catch {
      toast.error(t('adminPages.backupRestore.downloadFailed'));
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      const { data } = await backupsAPI.restore(confirmRestore.id);
      toast.success(data.message || t('adminPages.backupRestore.restoreCompleted'));
      setConfirmRestore(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('adminPages.backupRestore.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };

  const handleRestoreUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      toast.error(t('adminPages.backupRestore.invalidZip'));
      return;
    }
    const ok = window.confirm(t('adminPages.backupRestore.uploadConfirm'));
    if (!ok) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    try {
      const { data } = await backupsAPI.restoreUpload(file);
      toast.success(data.message || t('adminPages.backupRestore.restoreCompleted'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('adminPages.backupRestore.restoreFailed'));
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await backupsAPI.delete(confirmDelete.id);
      toast.success(t('adminPages.backupRestore.deleted'));
      setConfirmDelete(null);
      load();
    } catch {
      toast.error(t('adminPages.backupRestore.deleteFailed'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('nav.backups')}
        subtitle={t('adminPages.backupRestore.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faDatabase} className="text-primary-500" />
            <h2 className="font-display font-bold text-lg">{t('adminPages.backupRestore.createTitle')}</h2>
          </div>
          <p className="text-sm text-surface-500">
            {t('adminPages.backupRestore.createDescription')}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeFiles}
              onChange={(e) => setIncludeFiles(e.target.checked)}
              className="rounded border-surface-300"
            />
            {t('adminPages.backupRestore.includeFiles')}
          </label>
          <Button className="w-full" loading={creating} onClick={handleCreate}>
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 me-2" />
            {t('adminPages.backupRestore.createNow')}
          </Button>
          <hr className="border-surface-200 dark:border-surface-700" />
          <div>
            <p className="text-sm font-medium mb-2">{t('adminPages.backupRestore.restoreFromFile')}</p>
            <Button variant="outline" className="w-full" onClick={() => uploadRef.current?.click()} disabled={restoring}>
              <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4 me-2" />
              {t('adminPages.backupRestore.uploadRestore')}
            </Button>
            <input ref={uploadRef} type="file" accept=".zip" className="hidden" onChange={handleRestoreUpload} />
          </div>
        </Card>

        <Card className="lg:col-span-2" padding={false}>
          <div className="p-4 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
            <h2 className="font-display font-bold text-lg">{t('adminPages.backupRestore.historyTitle')}</h2>
            <Badge color="gray" size="sm">{t('adminPages.backupRestore.storedCount', { count: backups.length })}</Badge>
          </div>
          {loading ? (
            <p className="p-8 text-center text-surface-500">{t('common.loading')}</p>
          ) : backups.length === 0 ? (
            <p className="p-8 text-center text-surface-500">{t('adminPages.backupRestore.empty')}</p>
          ) : (
            <div className="responsive-table-wrap scroll-hint-x">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500">
                  <tr>
                    <th className="text-start px-4 py-3 font-medium">{t('adminPages.backupRestore.colDateTime')}</th>
                    <th className="text-start px-4 py-3 font-medium">{t('adminPages.backupRestore.colFile')}</th>
                    <th className="text-start px-4 py-3 font-medium">{t('adminPages.backupRestore.colSize')}</th>
                    <th className="text-start px-4 py-3 font-medium">{t('adminPages.backupRestore.colContents')}</th>
                    <th className="text-end px-4 py-3 font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-surface-900 dark:text-white">{formatDateTime(b.created_at)}</p>
                        <p className="text-xs text-surface-500">{timeAgo(b.created_at)} · {b.user?.name || t('adminPages.activityLog.system')}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{b.filename}</td>
                      <td className="px-4 py-3">{formatBytes(b.size_bytes)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge color="primary" size="xs">{b.database_driver}</Badge>
                          {b.includes_files && (
                            <Badge color="info" size="xs">
                              <FontAwesomeIcon icon={faHardDrive} className="w-2.5 h-2.5 me-1" />
                              {t('adminPages.backupRestore.filesBadge')}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleDownload(b)} title={t('adminPages.backupRestore.downloadTitle')}>
                            <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirmRestore(b)} title={t('adminPages.backupRestore.restoreTitle')}>
                            <FontAwesomeIcon icon={faRotateLeft} className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-danger-500" onClick={() => setConfirmDelete(b)}>
                            <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={handleRestore}
        loading={restoring}
        title={t('adminPages.backupRestore.restoreDialogTitle')}
        message={t('adminPages.backupRestore.restoreDialogMessage')}
        confirmLabel={t('adminPages.backupRestore.restoreNow')}
        confirmColor="danger"
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={t('adminPages.backupRestore.deleteDialogTitle')}
        message={t('adminPages.backupRestore.deleteDialogMessage', { filename: confirmDelete?.filename })}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
