import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Modal, FormField, Select, Button, Input } from '../common/UI';

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = [
  `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
  `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`,
];

export default function TimetableCreateModal({
  isOpen,
  onClose,
  sections = [],
  sectionsLoading = false,
  sectionsError = null,
  onCreate,
  loading = false,
  defaultSectionId = '',
}) {
  const { t } = useTranslation();
  const [sectionId, setSectionId] = useState('');
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEARS[1]);
  const [semester, setSemester] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSectionId(defaultSectionId || (sections[0]?.id ? String(sections[0].id) : ''));
    setAcademicYear(DEFAULT_YEARS[1]);
    setSemester('');
    setName('');
  }, [isOpen, defaultSectionId, sections]);

  const selectedSection = sections.find((s) => String(s.id) === sectionId);
  const hasSections = sections.length > 0;
  const canCreate = hasSections && sectionId && !sectionsLoading && !sectionsError;

  const handleCreate = () => {
    if (!sectionId) return;
    const sectionLabel = selectedSection?.label ?? 'Classe';
    onCreate?.({
      class_section_id: Number(sectionId),
      academic_year: academicYear,
      semester: semester.trim() || null,
      name: name.trim() || `${t('timetable.title')} — ${sectionLabel}`,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('timetable.newTimetable')}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleCreate} loading={loading} disabled={!canCreate}>
            {t('timetable.createAndOpen')}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-surface-500 mb-5">{t('timetable.createModalHint')}</p>

      <div className="space-y-4">
        <FormField label={t('timetable.selectClass')} required>
          {sectionsLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm text-surface-500">
              <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin text-primary-500" />
              {t('timetable.loadingClasses')}
            </div>
          ) : sectionsError ? (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-danger-500/30 bg-danger-500/10 text-sm text-danger-700 dark:text-danger-300">
              <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{sectionsError}</span>
            </div>
          ) : !hasSections ? (
            <div className="px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
              {t('timetable.noClassesAvailable')}
            </div>
          ) : (
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} required>
              <option value="">{t('timetable.selectClassPlaceholder')}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.grade_level} · {t('timetable.section')} {s.section})
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label={t('timetable.academicYear')} required>
          <Select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} disabled={!hasSections}>
            {DEFAULT_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('timetable.semester')}>
          <Select value={semester} onChange={(e) => setSemester(e.target.value)} disabled={!hasSections}>
            <option value="">{t('timetable.semesterOptional')}</option>
            <option value="S1">{t('timetable.semester1')}</option>
            <option value="S2">{t('timetable.semester2')}</option>
          </Select>
        </FormField>

        <FormField label={t('timetable.timetableName')}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!hasSections}
            placeholder={
              selectedSection
                ? `${t('timetable.title')} — ${selectedSection.label}`
                : t('timetable.timetableNamePlaceholder')
            }
          />
        </FormField>
      </div>
    </Modal>
  );
}
