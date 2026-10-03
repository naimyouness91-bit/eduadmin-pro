import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowUp, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { Button } from '../common/UI';

const ACCEPT = '.pdf,.doc,.docx,.txt';

export default function FileUploadCard({
  courses,
  courseId,
  onCourseChange,
  onUpload,
  uploading,
  uploadProgress,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);

  const handleFile = (e) => {
    const picked = e.target.files?.[0];
    setFile(picked ?? null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || !courseId) return;
    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('file', file);
    onUpload(formData, () => {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faCloudArrowUp} className="text-primary-500" />
        <h3 className="font-display font-semibold text-surface-900 dark:text-white">{t('aiQuizPage.uploadCourseFile')}</h3>
      </div>
      <p className="text-xs text-surface-500">{t('aiQuizPage.uploadFormatsHint')}</p>

      <label className="block text-xs font-medium text-surface-500 mb-1">{t('common.course')}</label>
      <select
        value={courseId}
        onChange={(e) => onCourseChange(e.target.value)}
        className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
      >
        <option value="">{t('aiQuizPage.selectCoursePlaceholder')}</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>

      <div
        className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFile}
        />
        <FontAwesomeIcon icon={faFileLines} className="text-2xl text-surface-400 mb-2" />
        {file ? (
          <p className="text-sm font-medium text-surface-800 dark:text-surface-100">{file.name}</p>
        ) : (
          <p className="text-sm text-surface-500">{t('aiQuizPage.clickToChooseFile')}</p>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-surface-500 text-end">{uploadProgress}%</p>
        </div>
      )}

      <Button type="submit" disabled={uploading || !file || !courseId} loading={uploading} className="w-full">
        {t('aiQuizPage.uploadExtractText')}
      </Button>
    </form>
  );
}
