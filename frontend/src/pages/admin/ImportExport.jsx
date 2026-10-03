import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileExcel,
  faDownload,
  faUpload,
  faCircleCheck,
  faCircleXmark,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { importExportAPI } from '../../services/api';
import { PageHeader, Card, Button, Badge } from '../../components/common/UI';

function statusColor(status) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'processing') return 'warning';
  return 'gray';
}

export default function ImportExport() {
  const { t } = useTranslation();
  const [importType, setImportType] = useState('students');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [job, setJob] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  const IMPORT_TYPES = useMemo(
    () => [
      { type: 'students', label: t('common.students') },
      { type: 'teachers', label: t('nav.teachers') },
      { type: 'courses', label: t('adminPages.importExport.typeCourses') },
    ],
    [t],
  );

  const EXPORT_TYPES = useMemo(
    () => [
      { type: 'students', label: t('common.students') },
      { type: 'teachers', label: t('nav.teachers') },
      { type: 'grades', label: t('adminPages.importExport.typeGrades') },
      { type: 'attendance', label: t('adminPages.importExport.typeAttendance') },
    ],
    [t],
  );

  const statusLabel = (status) => {
    if (status === 'completed') return t('adminPages.importExport.statusCompleted');
    if (status === 'failed') return t('adminPages.importExport.statusFailed');
    if (status === 'processing') return t('adminPages.importExport.statusProcessing');
    return status;
  };

  const loadRecentJobs = useCallback(async () => {
    try {
      const { data } = await importExportAPI.recentJobs();
      setRecentJobs(data.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadRecentJobs();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadRecentJobs]);

  const pollJob = (jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await importExportAPI.jobStatus(jobId);
        const j = data.data;
        setJob(j);
        if (j.status === 'completed' || j.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setImporting(false);
          loadRecentJobs();
          if (j.status === 'completed') {
            toast.success(j.message || t('adminPages.importExport.importCompleted'));
          } else {
            toast.error(j.message || t('adminPages.importExport.importFailed'));
          }
        }
      } catch {
        clearInterval(pollRef.current);
        setImporting(false);
      }
    }, 500);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error(t('adminPages.importExport.invalidFileType'));
      return;
    }

    setImporting(true);
    setUploadProgress(0);
    setJob(null);

    try {
      const { data } = await importExportAPI.import(importType, file, {
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      const result = data.data;
      setJob(result);

      if (result.status === 'processing') {
        pollJob(result.id);
      } else {
        setImporting(false);
        loadRecentJobs();
        if (result.status === 'completed') {
          toast.success(data.message || t('adminPages.importExport.importCompleted'));
        } else {
          toast.error(data.message || t('adminPages.importExport.importFailed'));
        }
      }
    } catch (err) {
      setImporting(false);
      const msg = err.response?.data?.message || err.response?.data?.data?.message;
      toast.error(msg || t('adminPages.importExport.importFailed'));
      if (err.response?.data?.data) setJob(err.response.data.data);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleExport = async (type) => {
    setExporting(type);
    const typeLabel = EXPORT_TYPES.find((e) => e.type === type)?.label ?? type;
    try {
      await importExportAPI.export(type);
      toast.success(t('adminPages.importExport.exported', { type: typeLabel }));
    } catch {
      toast.error(t('adminPages.importExport.exportFailed'));
    } finally {
      setExporting(null);
    }
  };

  const handleTemplate = async (type) => {
    try {
      await importExportAPI.downloadTemplate(type);
      toast.success(t('adminPages.importExport.templateDownloaded'));
    } catch {
      toast.error(t('adminPages.importExport.templateDownloadFailed'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('nav.importExport')}
        subtitle={t('adminPages.importExport.subtitle')}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUpload} className="text-primary-500" />
            <h2 className="font-display font-bold text-lg">{t('adminPages.importExport.importTitle')}</h2>
          </div>
          <p className="text-sm text-surface-500">
            {t('adminPages.importExport.importDescription')}
          </p>

          <div className="flex flex-wrap gap-2">
            {IMPORT_TYPES.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setImportType(item.type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  importType === item.type
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleTemplate(importType)}>
              <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5 me-2" />
              {t('adminPages.importExport.downloadTemplate')}
            </Button>
            <Button
              size="sm"
              loading={importing}
              onClick={() => fileRef.current?.click()}
            >
              <FontAwesomeIcon icon={faFileExcel} className="w-3.5 h-3.5 me-2" />
              {t('adminPages.importExport.uploadExcel')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {importing && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-surface-500 mb-1">
                <span>{t('adminPages.importExport.uploadingFile')}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {job && (
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  {job.status === 'processing' && (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-warning-500" />
                  )}
                  {job.status === 'completed' && (
                    <FontAwesomeIcon icon={faCircleCheck} className="text-success-500" />
                  )}
                  {job.status === 'failed' && (
                    <FontAwesomeIcon icon={faCircleXmark} className="text-danger-500" />
                  )}
                  {job.original_filename || t('adminPages.importExport.importLabel')}
                </span>
                <Badge color={statusColor(job.status)} size="xs">{statusLabel(job.status)}</Badge>
              </div>

              {(job.status === 'processing' || job.progress_percent > 0) && (
                <div>
                  <div className="flex justify-between text-xs text-surface-500 mb-1">
                    <span>{t('adminPages.importExport.processingRows')}</span>
                    <span>{job.progress_percent ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                    <div
                      className="h-full bg-success-500 transition-all"
                      style={{ width: `${job.progress_percent ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-surface-500 mt-1">
                    {t('adminPages.importExport.rowsProgress', {
                      processed: job.processed_rows,
                      total: job.total_rows,
                    })}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-success-500/10 p-2">
                  <p className="font-bold text-success-600">{job.success_count ?? 0}</p>
                  <p className="text-surface-500">{t('adminPages.importExport.success')}</p>
                </div>
                <div className="rounded-lg bg-warning-500/10 p-2">
                  <p className="font-bold text-warning-600">{job.skipped_count ?? 0}</p>
                  <p className="text-surface-500">{t('adminPages.importExport.skipped')}</p>
                </div>
                <div className="rounded-lg bg-danger-500/10 p-2">
                  <p className="font-bold text-danger-600">{job.failed_count ?? 0}</p>
                  <p className="text-surface-500">{t('adminPages.importExport.failed')}</p>
                </div>
              </div>

              {job.message && (
                <p className="text-sm text-surface-600 dark:text-surface-400">{job.message}</p>
              )}

              {job.errors?.length > 0 && (
                <div className="max-h-40 overflow-y-auto text-xs space-y-1 border-t border-surface-100 dark:border-surface-800 pt-2">
                  {job.errors.slice(0, 50).map((err, i) => (
                    <p key={i} className="text-danger-600 dark:text-danger-400">
                      {t('adminPages.importExport.rowError', { row: err.row, message: err.message })}
                    </p>
                  ))}
                  {job.errors.length > 50 && (
                    <p className="text-surface-500">{t('adminPages.importExport.moreErrors', { count: job.errors.length - 50 })}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faDownload} className="text-primary-500" />
            <h2 className="font-display font-bold text-lg">{t('adminPages.importExport.exportTitle')}</h2>
          </div>
          <p className="text-sm text-surface-500">
            {t('adminPages.importExport.exportDescription')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXPORT_TYPES.map((item) => (
              <Button
                key={item.type}
                variant="outline"
                className="justify-start"
                loading={exporting === item.type}
                onClick={() => handleExport(item.type)}
              >
                <FontAwesomeIcon icon={faFileExcel} className="w-4 h-4 me-2 text-success-600" />
                {t('adminPages.importExport.exportType', { type: item.label })}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {recentJobs.length > 0 && (
        <Card padding={false}>
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <h3 className="font-semibold text-surface-900 dark:text-white">{t('adminPages.importExport.recentImports')}</h3>
          </div>
          <div className="responsive-table-wrap scroll-hint-x">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500">
                <tr>
                  <th className="text-start px-4 py-2">{t('adminPages.backupRestore.colFile')}</th>
                  <th className="text-start px-4 py-2">{t('adminPages.importExport.colType')}</th>
                  <th className="text-start px-4 py-2">{t('common.status')}</th>
                  <th className="text-end px-4 py-2">{t('adminPages.importExport.colResult')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {recentJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="px-4 py-2">{j.original_filename}</td>
                    <td className="px-4 py-2 capitalize">{j.type}</td>
                    <td className="px-4 py-2">
                      <Badge color={statusColor(j.status)} size="xs">{statusLabel(j.status)}</Badge>
                    </td>
                    <td className="px-4 py-2 text-end text-surface-500">
                      {t('adminPages.importExport.resultSummary', {
                        success: j.success_count,
                        skipped: j.skipped_count,
                        failed: j.failed_count,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
