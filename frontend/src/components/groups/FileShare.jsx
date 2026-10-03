import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faUpload, faFile } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../common/UI';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileShare({ files, canUpload, onUpload, onDownload, uploading }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {canUpload && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFile}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.txt"
          />
          <Button size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <FontAwesomeIcon icon={faUpload} className="me-1" />
            {uploading ? t('groupsPage.uploading') : t('groupsPage.uploadFile')}
          </Button>
        </div>
      )}

      {!files?.length ? (
        <p className="text-sm text-surface-500">{t('groupsPage.noFilesYet')}</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-700"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FontAwesomeIcon icon={faFile} className="text-primary-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.file_name}</p>
                  <p className="text-xs text-surface-500">
                    {f.user?.name} · {formatBytes(f.file_size)}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onDownload(f)}>
                <FontAwesomeIcon icon={faDownload} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
