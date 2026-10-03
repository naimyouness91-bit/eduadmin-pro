import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faFilePdf,
  faDownload,
  faPaperPlane,
  faWandMagicSparkles,
  faCircleInfo,
  faChartLine,
  faUserCheck,
  faBook,
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { reportsAPI } from '../../services/api';
import { openBulletinPreview, printBulletin, downloadBulletin } from '../../utils/bulletinActions';
import { Badge, Button, Card } from '../common/UI';

const STATUS_COLORS = {
  draft: 'gray',
  generated: 'warning',
  published: 'success',
};

const ADMIN_STATUS_FALLBACK = {
  status: 'draft',
  is_published: false,
  is_generated: false,
  can_preview: true,
  can_download: true,
  can_generate: true,
  can_publish: false,
};

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${Math.round(num * 10) / 10}%`;
}

function BulletinAcademicSection({ preview, previewLoading, previewError, t }) {
  if (previewLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse"
            />
          ))}
        </div>
        <div className="h-32 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="p-4 rounded-xl border border-danger-500/30 bg-danger-500/10 text-sm text-danger-600 dark:text-danger-400">
        {previewError}
      </div>
    );
  }

  if (!preview) return null;

  const summary = preview.summary ?? {};
  const grades = preview.grades ?? [];
  const attendance = preview.attendance_by_course ?? [];

  if (!preview.has_grades) {
    return (
      <div className="p-4 rounded-xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-50/80 dark:bg-surface-800/40 text-sm text-surface-600 dark:text-surface-300 text-center">
        {t('bulletin.noAcademicData')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-50/80 dark:bg-surface-800/40">
          <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
            <FontAwesomeIcon icon={faChartLine} className="text-primary-500" />
            {t('bulletin.averageGrade')}
          </div>
          <p className="text-lg font-semibold text-surface-900 dark:text-white">
            {formatPercent(summary.average_grade)}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-50/80 dark:bg-surface-800/40">
          <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
            <FontAwesomeIcon icon={faUserCheck} className="text-emerald-500" />
            {t('bulletin.attendanceRate')}
          </div>
          <p className="text-lg font-semibold text-surface-900 dark:text-white">
            {formatPercent(summary.attendance_rate)}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-50/80 dark:bg-surface-800/40">
          <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
            <FontAwesomeIcon icon={faBook} className="text-violet-500" />
            {t('bulletin.coursesEnrolled')}
          </div>
          <p className="text-lg font-semibold text-surface-900 dark:text-white">
            {summary.courses_enrolled ?? 0}
          </p>
        </div>
      </div>

      {(preview.courses?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 bg-surface-50/80 dark:bg-surface-800/40 border-b border-surface-200/80 dark:border-surface-700/60">
            {t('bulletin.subjects')}
          </p>
          <ul className="divide-y divide-surface-100 dark:divide-surface-800">
            {preview.courses.map((course) => (
              <li
                key={course.course_id ?? course.name}
                className="px-4 py-2 flex justify-between gap-2 text-sm"
              >
                <span className="text-surface-800 dark:text-surface-200 truncate">
                  {course.name}
                </span>
                <span className="text-surface-500 shrink-0">
                  {course.average != null ? formatPercent(course.average) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[320px]">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-surface-500 bg-surface-50/80 dark:bg-surface-800/40 border-b border-surface-200/80 dark:border-surface-700/60">
              <th className="px-4 py-2 font-semibold">{t('bulletin.subject')}</th>
              <th className="px-4 py-2 font-semibold">{t('bulletin.assessment')}</th>
              <th className="px-4 py-2 font-semibold">{t('bulletin.score')}</th>
              <th className="px-4 py-2 font-semibold">{t('bulletin.date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {grades.map((row, idx) => (
              <tr key={`${row.course}-${row.title}-${idx}`}>
                <td className="px-4 py-2 text-surface-800 dark:text-surface-200">{row.course}</td>
                <td className="px-4 py-2 text-surface-600 dark:text-surface-400">
                  {row.title}
                  <span className="text-xs text-surface-400 ml-1">({row.type})</span>
                </td>
                <td className="px-4 py-2 font-medium text-surface-900 dark:text-white">
                  {row.score}
                  {row.percentage !== '—' && (
                    <span className="text-xs text-surface-500 ml-1">{row.percentage}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-surface-500">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {attendance.length > 0 && (
        <div className="rounded-xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 bg-surface-50/80 dark:bg-surface-800/40 border-b border-surface-200/80 dark:border-surface-700/60">
            {t('bulletin.attendanceByCourse')}
          </p>
          <ul className="divide-y divide-surface-100 dark:divide-surface-800">
            {attendance.map((row) => (
              <li
                key={row.course}
                className="px-4 py-2 flex justify-between gap-2 text-sm"
              >
                <span className="text-surface-800 dark:text-surface-200 truncate">
                  {row.course}
                </span>
                <span className="text-surface-500 shrink-0">
                  {formatPercent(row.rate)}
                  {row.total > 0 && (
                    <span className="text-xs ml-1">
                      ({row.present}/{row.total})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AcademicBulletinPanel({
  studentId,
  studentCode,
  variant = 'admin',
  embedded = false,
  onStatusChange,
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [action, setAction] = useState(null);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const isAdmin = variant === 'admin';

  const loadStatus = useCallback(async () => {
    if (!studentId) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const { data } = await reportsAPI.getBulletinStatus(studentId);
      setStatus(data.data);
      onStatusChangeRef.current?.(data.data);
    } catch (err) {
      console.error('[Bulletin] Failed to load status', { studentId, err });
      if (isAdmin) {
        setStatus(ADMIN_STATUS_FALLBACK);
        onStatusChangeRef.current?.(ADMIN_STATUS_FALLBACK);
      } else {
        setStatusError(t('bulletin.loadError'));
        toast.error(t('bulletin.loadError'));
      }
    } finally {
      setStatusLoading(false);
    }
  }, [studentId, isAdmin, t]);

  const loadPreview = useCallback(async () => {
    if (!studentId) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const { data } = await reportsAPI.getBulletinPreview(studentId);
      setPreview(data.data);
    } catch (err) {
      console.error('[Bulletin] Failed to load academic preview', { studentId, err });
      const message = t('bulletin.previewLoadError');
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    if (!studentId) return undefined;
    setStatus(null);
    setPreview(null);
    setStatusError(null);
    setPreviewError(null);
    loadStatus();
    loadPreview();
    return undefined;
  }, [studentId, loadStatus, loadPreview]);

  const runAction = async (key, fn) => {
    setAction(key);
    try {
      await fn();
    } catch (err) {
      console.error('[Bulletin] Action failed', { studentId, key, err });
      if (err?.message === 'POPUP_BLOCKED') {
        toast.error(t('bulletin.popupBlocked'));
      } else {
        toast.error(t('bulletin.actionError'));
      }
    } finally {
      setAction(null);
    }
  };

  const handleGenerate = async () => {
    setAction('generate');
    try {
      const { data } = await reportsAPI.generateBulletin(studentId);
      setStatus(data.data);
      onStatusChangeRef.current?.(data.data);
      toast.success(t('bulletin.generatedSuccess'));
      await loadPreview();
    } catch (err) {
      console.error('[Bulletin] Generate failed', { studentId, err });
      toast.error(t('bulletin.generateError'));
    } finally {
      setAction(null);
    }
  };

  const handlePublish = async () => {
    setAction('publish');
    try {
      const { data } = await reportsAPI.publishBulletin(studentId);
      setStatus(data.data);
      onStatusChangeRef.current?.(data.data);
      toast.success(t('bulletin.publishedSuccess'));
    } catch (err) {
      console.error('[Bulletin] Publish failed', { studentId, err });
      toast.error(t('bulletin.publishError'));
    } finally {
      setAction(null);
    }
  };

  const statusKey = status?.status || 'draft';
  const workflowLoading = statusLoading && !status;

  const workflowSection = workflowLoading ? (
    <div className="h-16 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
  ) : statusError && !status ? (
    <div className="p-4 rounded-xl border border-danger-500/30 bg-danger-500/10 text-sm text-danger-600 dark:text-danger-400">
      {statusError}
    </div>
  ) : (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-surface-50/80 dark:bg-surface-800/40 border border-surface-200/80 dark:border-surface-700/60">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faFilePdf} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-surface-900 dark:text-white">
              {t('bulletin.workflowTitle')}
            </p>
            <p className="text-xs text-surface-500 mt-0.5">
              {status?.academic_year && status?.semester
                ? `${status.academic_year} · ${status.semester}`
                : t('bulletin.workflowHint')}
            </p>
          </div>
        </div>
        <Badge color={STATUS_COLORS[statusKey] || 'gray'} size="sm" className="self-start sm:self-center">
          {t(`bulletin.status.${statusKey}`, { defaultValue: statusKey })}
        </Badge>
      </div>

      {!status?.is_published && !isAdmin && (
        <div className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-300 p-3 rounded-xl border border-warning-500/30 bg-warning-500/10">
          <FontAwesomeIcon icon={faCircleInfo} className="text-warning-500 mt-0.5 shrink-0" />
          <p>{t('bulletin.notPublishedYet')}</p>
        </div>
      )}

      {isAdmin && statusKey === 'draft' && (
        <p className="text-xs text-surface-500 flex items-center gap-2">
          <FontAwesomeIcon icon={faCircleInfo} className="shrink-0" />
          {t('bulletin.adminDraftHint')}
        </p>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        {status?.can_preview && (
          <Button
            variant={isAdmin ? 'outline' : 'primary'}
            icon={faEye}
            loading={action === 'preview'}
            disabled={!!action || previewLoading}
            onClick={() =>
              runAction('preview', () => openBulletinPreview(studentId))
            }
            className="w-full sm:w-auto"
          >
            {t('bulletin.preview')}
          </Button>
        )}

        {isAdmin && status?.can_generate && (
          <Button
            variant="outline"
            icon={faWandMagicSparkles}
            loading={action === 'generate'}
            disabled={!!action}
            onClick={handleGenerate}
            className="w-full sm:w-auto"
          >
            {t('bulletin.generate')}
          </Button>
        )}

        {status?.can_download && (
          <Button
            variant="outline"
            icon={faDownload}
            loading={action === 'download'}
            disabled={!!action || previewLoading}
            onClick={() =>
              runAction('download', () => downloadBulletin(studentId, studentCode))
            }
            className="w-full sm:w-auto"
          >
            {t('bulletin.download')}
          </Button>
        )}

        {(status?.can_preview || status?.is_published) && (
          <Button
            variant="ghost"
            icon={faFilePdf}
            loading={action === 'print'}
            disabled={!status?.can_preview || !!action || previewLoading}
            onClick={() => runAction('print', () => printBulletin(studentId))}
            className="w-full sm:w-auto"
          >
            {t('bulletin.print')}
          </Button>
        )}

        {isAdmin && status?.can_publish && (
          <Button
            icon={faPaperPlane}
            loading={action === 'publish'}
            disabled={!!action}
            onClick={handlePublish}
            className="w-full sm:w-auto"
          >
            {t('bulletin.publish')}
          </Button>
        )}
      </div>

      {status?.published_at && (
        <p className="text-xs text-surface-400">
          {t('bulletin.publishedAt', {
            date: new Date(status.published_at).toLocaleString(),
          })}
        </p>
      )}
    </div>
  );

  const body = (
    <div className="space-y-6">
      <BulletinAcademicSection
        preview={preview}
        previewLoading={previewLoading}
        previewError={previewError}
        t={t}
      />
      {workflowSection}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <Card
      title={t('bulletin.title')}
      subtitle={t('bulletin.subtitle')}
      className="overflow-hidden"
    >
      {body}
    </Card>
  );
}
