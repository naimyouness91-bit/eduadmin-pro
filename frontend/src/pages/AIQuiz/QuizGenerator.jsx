import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles, faRobot } from '@fortawesome/free-solid-svg-icons';
import { aiQuizAPI, coursesAPI } from '../../services/api';
import FileUploadCard from '../../components/ai-quiz/FileUploadCard';
import DifficultySelector from '../../components/ai-quiz/DifficultySelector';
import QuizPreviewPanel from '../../components/ai-quiz/QuizPreviewPanel';
import { Button, Badge, EmptyState } from '../../components/common/UI';

export default function QuizGenerator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [options, setOptions] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');
  const [settings, setSettings] = useState({
    difficulty: 'medium',
    question_count: 10,
    question_types: ['mcq', 'true_false', 'short_answer'],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [optRes, courseRes, docRes] = await Promise.all([
          aiQuizAPI.options(),
          coursesAPI.list({ per_page: 100 }),
          aiQuizAPI.listDocuments({ per_page: 30 }),
        ]);
        setOptions(optRes.data.data);
        setCourses(courseRes.data.data ?? []);
        setDocuments(docRes.data.data ?? []);
        if (optRes.data.data?.difficulties?.[1]) {
          setSettings((s) => ({
            ...s,
            difficulty: optRes.data.data.difficulties[1].value,
          }));
        }
      } catch {
        toast.error(t('aiQuizPage.loadGeneratorFailed'));
      }
    })();
  }, [t]);

  const refreshDocuments = async () => {
    const { data } = await aiQuizAPI.listDocuments({ per_page: 30, course_id: courseId || undefined });
    setDocuments(data.data ?? []);
  };

  const handleUpload = async (formData, onDone) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const { data } = await aiQuizAPI.uploadDocument(formData, (e) => {
        if (e.total) {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      const doc = data.data;
      if (doc?.extraction_status === 'failed') {
        toast.error(doc.extraction_error || data.message || t('aiQuizPage.extractionFailed'));
      } else {
        toast.success(data.message || t('aiQuizPage.fileUploaded'));
      }
      await refreshDocuments();
      if (doc?.id && doc.extraction_status === 'completed') setSelectedDoc(String(doc.id));
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.file?.[0] || t('aiQuizPage.uploadFailed'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const buildPayload = () => ({
    document_id: Number(selectedDoc),
    ...settings,
  });

  const handlePreview = async () => {
    if (!selectedDoc) {
      toast.error(t('aiQuizPage.selectDocument'));
      return;
    }
    setGenerating(true);
    setPreview(null);
    try {
      const { data } = await aiQuizAPI.preview(buildPayload());
      setPreview(data.data);
      toast.success(data.message || t('aiQuizPage.previewReady'));
    } catch (err) {
      const body = err.response?.data;
      toast.error(body?.message || t('aiQuizPage.generationFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!preview?.questions?.length) return;
    setSaving(true);
    try {
      const { data } = await aiQuizAPI.generate({
        ...buildPayload(),
        title: preview.title,
        questions: preview.questions,
      });
      toast.success(data.message || t('aiQuizPage.quizSaved'));
      navigate(`/ai-quiz/${data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('aiQuizPage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const readyDocs = documents.filter((d) => d.extraction_status === 'completed');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950/30 px-4 py-3 text-sm text-primary-900 dark:text-primary-100">
        <FontAwesomeIcon icon={faRobot} className="me-2" />
        {options?.generator_label || t('aiQuizPage.localModeLabel')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileUploadCard
          courses={courses}
          courseId={courseId}
          onCourseChange={setCourseId}
          onUpload={handleUpload}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
        <DifficultySelector
          difficulties={options?.difficulties}
          questionCounts={options?.question_counts}
          questionTypes={options?.question_types}
          values={settings}
          onChange={(next) => {
            setSettings(next);
            setPreview(null);
          }}
          disabled={generating || saving}
        />
      </div>

      <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/80 p-5 shadow-sm space-y-4">
        <h3 className="font-display font-semibold text-surface-900 dark:text-white">
          {t('aiQuizPage.generateFromDocument')}
        </h3>
        {readyDocs.length === 0 ? (
          <EmptyState
            title={t('aiQuizPage.noExtractedDocuments')}
            description={t('aiQuizPage.noExtractedHint')}
          />
        ) : (
          <select
            value={selectedDoc}
            onChange={(e) => {
              setSelectedDoc(e.target.value);
              setPreview(null);
            }}
            className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-sm"
          >
            <option value="">{t('aiQuizPage.selectDocumentPlaceholder')}</option>
            {readyDocs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.original_filename} — {d.text_preview?.slice(0, 40)}…
              </option>
            ))}
          </select>
        )}
        <Button
          onClick={handlePreview}
          disabled={generating || saving || !selectedDoc}
          loading={generating}
          className="w-full sm:w-auto"
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} className="me-2" />
          {preview ? t('aiQuizPage.regeneratePreview') : t('aiQuizPage.generatePreview')}
        </Button>
      </div>

      <QuizPreviewPanel
        preview={preview}
        onSave={handleSave}
        onRegenerate={handlePreview}
        saving={saving}
        regenerating={generating}
      />

      {documents.length > 0 && (
        <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-800 text-surface-500 text-xs uppercase">
              <tr>
                <th className="text-left p-3">{t('aiQuizPage.columnFile')}</th>
                <th className="text-left p-3">{t('aiQuizPage.columnStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-surface-100 dark:border-surface-800">
                  <td className="p-3">{d.original_filename}</td>
                  <td className="p-3">
                    <Badge
                      color={
                        d.extraction_status === 'completed'
                          ? 'success'
                          : d.extraction_status === 'failed'
                            ? 'danger'
                            : 'gray'
                      }
                      size="sm"
                    >
                      {t(`aiQuizPage.extractionStatuses.${d.extraction_status}`, { defaultValue: d.extraction_status })}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
