import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faCopy,
  faPaperPlane,
  faTrash,
  faTriangleExclamation,
  faCalendarPlus,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { timetablesAPI, teachersAPI } from '../../services/api';
import { conflictEntryIds, conflictKeysFromGrid } from '../../utils/timetableConstants';
import { Button, ConfirmDialog, Badge } from '../common/UI';
import TimetableClassSidebar from './TimetableClassSidebar';
import EmploiDuTempsGrid from './EmploiDuTempsGrid';
import TimetableCellEditor from './TimetableCellEditor';
import TimetableCreateModal from './TimetableCreateModal';
import TimetablePrintBar from './TimetablePrintBar';
import TimetableGenerationSummary from './TimetableGenerationSummary';
import TimetableRescheduleAdminPanel from './TimetableRescheduleAdminPanel';

export default function TimetableAdminManager() {
  const { t } = useTranslation();
  const [sections, setSections] = useState([]);
  const [overview, setOverview] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [timetableId, setTimetableId] = useState('');
  const [grid, setGrid] = useState(null);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cellModal, setCellModal] = useState({ open: false, slot: null, isNew: true });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTimetableId, setDeleteTimetableId] = useState(null);
  const [deleteSlot, setDeleteSlot] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [dragEntryId, setDragEntryId] = useState(null);
  const [generationSummary, setGenerationSummary] = useState(null);

  const loadOverview = useCallback(async () => {
    try {
      const { data } = await timetablesAPI.overview();
      setOverview(data.data ?? []);
    } catch {
      setOverview([]);
    }
  }, []);

  const loadSections = useCallback(async () => {
    setSidebarLoading(true);
    setSectionsError(null);
    try {
      const { data: secData } = await timetablesAPI.classSections();
      const list = secData.data ?? [];
      setSections(list);
      await loadOverview();
      return list;
    } catch (err) {
      console.error('[EmploiDuTemps] sections failed', err);
      const status = err?.response?.status;
      const message =
        status === 403
          ? t('timetable.sectionsForbidden')
          : err?.response?.data?.message ?? t('timetable.sectionsLoadError');
      setSections([]);
      setSectionsError(message);
      toast.error(message);
      return [];
    } finally {
      setSidebarLoading(false);
    }
  }, [loadOverview, t]);

  const loadTimetablesForSection = useCallback(async (sid) => {
    if (!sid) {
      setTimetables([]);
      return [];
    }
    const { data } = await timetablesAPI.list({ class_section_id: sid });
    const list = data.data ?? [];
    setTimetables(list);
    return list;
  }, []);

  const loadGrid = useCallback(async (tid) => {
    if (!tid) {
      setGrid(null);
      return;
    }
    setGridLoading(true);
    try {
      const { data } = await timetablesAPI.get(tid);
      setGrid(data.data);
    } catch (err) {
      console.error('[EmploiDuTemps] grid failed', err);
      toast.error(t('timetable.loadError'));
      setGrid(null);
    } finally {
      setGridLoading(false);
    }
  }, [t]);

  const loadCourses = useCallback(async (sid) => {
    if (!sid) {
      setCourses([]);
      return;
    }
    try {
      const { data } = await timetablesAPI.sectionCourses(sid);
      setCourses(data.data ?? []);
    } catch {
      setCourses([]);
    }
  }, []);

  const loadTeachers = useCallback(async () => {
    try {
      const { data } = await teachersAPI.list({ per_page: 200 });
      setTeachers(data.data ?? []);
    } catch {
      setTeachers([]);
    }
  }, []);

  useEffect(() => {
    loadSections();
    loadTeachers();
  }, [loadSections, loadTeachers]);

  useEffect(() => {
    if (createModalOpen) {
      loadSections();
    }
  }, [createModalOpen, loadSections]);

  useEffect(() => {
    if (!sectionId) return undefined;
    let cancelled = false;

    (async () => {
      loadCourses(sectionId);
      const list = await loadTimetablesForSection(sectionId);
      if (cancelled) return;

      if (list.length === 0) {
        setTimetableId('');
        setGrid(null);
        return;
      }

      const published = list.find((tt) => tt.is_published);
      const pick = published ?? list[0];
      setTimetableId(String(pick.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [sectionId, loadTimetablesForSection, loadCourses]);

  useEffect(() => {
    if (timetableId) loadGrid(timetableId);
    else setGrid(null);
  }, [timetableId, loadGrid]);

  const conflictKeys = useMemo(
    () => conflictKeysFromGrid(grid?.conflicts ?? [], grid?.cells ?? {}),
    [grid?.conflicts, grid?.cells]
  );

  const conflictIds = useMemo(
    () => conflictEntryIds(grid?.conflicts ?? []),
    [grid?.conflicts]
  );

  const selectedSection = sections.find((s) => String(s.id) === String(sectionId));
  const selectedTimetable = timetables.find((tt) => String(tt.id) === String(timetableId));
  const sessionCount = grid?.sessions?.length ?? 0;
  const hasActiveEditor = Boolean(sectionId && timetableId);

  const refreshAll = async () => {
    await loadOverview();
    if (sectionId) {
      await loadTimetablesForSection(sectionId);
      if (timetableId) await loadGrid(timetableId);
    }
  };

  const handleAutoGenerate = async () => {
    if (!sectionId) return;
    setActionBusy('generate');
    try {
      const { data } = await timetablesAPI.autoGenerate({
        class_section_id: Number(sectionId),
        publish: true,
      });
      toast.success(data.message || t('timetable.autoGenerateSuccess'));
      const list = await loadTimetablesForSection(sectionId);
      const tid = String(data.data?.timetable?.id ?? list[0]?.id ?? '');
      if (tid) {
        setTimetableId(tid);
        setGrid(data.data);
        setGenerationSummary(data.data?.generation_summary ?? null);
      }
      await loadCourses(sectionId);
      await loadOverview();
      setRegenerateConfirm(false);
    } catch (err) {
      const conflicts = err?.response?.data?.errors?.conflicts;
      const msg =
        conflicts?.[0]?.message
        ?? err?.response?.data?.errors?.class_section_id?.[0]
        ?? err?.response?.data?.message
        ?? t('timetable.autoGenerateError');
      toast.error(msg);
    } finally {
      setActionBusy(null);
    }
  };

  const handleCreateTimetable = async (payload) => {
    setSaving(true);
    try {
      const { data } = await timetablesAPI.create(payload);
      const created = data.data;
      toast.success(t('timetable.created'));
      setCreateModalOpen(false);
      setSectionId(String(payload.class_section_id));
      await loadTimetablesForSection(payload.class_section_id);
      setTimetableId(String(created.id));
      await loadGrid(created.id);
      await loadOverview();
    } catch (err) {
      console.error('[EmploiDuTemps] create failed', err);
      toast.error(t('timetable.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCell = async (payload) => {
    if (!timetableId) return;
    setSaving(true);
    try {
      const { data } = await timetablesAPI.upsertEntry(timetableId, payload);
      setGrid(data.data);
      setCellModal({ open: false, slot: null, isNew: true });
      toast.success(t('timetable.slotSaved'));
      loadOverview();
    } catch (err) {
      const conflicts = err?.response?.data?.errors?.conflicts;
      const msg = conflicts?.[0]?.message ?? t('timetable.saveError');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCell = async () => {
    if (!deleteSlot?.cell?.id) return;
    setSaving(true);
    try {
      const { data } = await timetablesAPI.deleteEntry(deleteSlot.cell.id);
      setGrid(data.data);
      setDeleteSlot(null);
      toast.success(t('timetable.sessionDeleted'));
      loadOverview();
    } catch {
      toast.error(t('timetable.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCellDrop = async ({ day, period }) => {
    if (!dragEntryId) return;
    setSaving(true);
    try {
      const { data } = await timetablesAPI.moveEntry(dragEntryId, {
        day_of_week: day,
        start_time: period.start,
        end_time: period.end,
      });
      setGrid(data.data);
      toast.success(t('timetable.slotSaved'));
    } catch (err) {
      const conflicts = err?.response?.data?.errors?.conflicts;
      toast.error(conflicts?.[0]?.message ?? t('timetable.conflict'));
    } finally {
      setDragEntryId(null);
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!timetableId) return;
    setActionBusy('duplicate');
    try {
      const { data } = await timetablesAPI.duplicate(timetableId);
      toast.success(data.message || t('timetable.duplicated'));
      await loadTimetablesForSection(sectionId);
      setTimetableId(String(data.data.id));
    } catch {
      toast.error(t('timetable.duplicateError'));
    } finally {
      setActionBusy(null);
    }
  };

  const handlePublish = async () => {
    if (!timetableId) return;
    setActionBusy('publish');
    try {
      const { data } = await timetablesAPI.publish(timetableId);
      toast.success(data.message || t('timetable.publishedSuccess'));
      setGrid(data.data);
      await refreshAll();
    } catch (err) {
      if (err?.response?.data?.conflicts?.length) {
        toast.error(t('timetable.conflictPublish'));
      } else {
        toast.error(t('timetable.publishError'));
      }
    } finally {
      setActionBusy(null);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!deleteTimetableId) return;
    try {
      await timetablesAPI.delete(deleteTimetableId);
      toast.success(t('timetable.deleted'));
      const list = await loadTimetablesForSection(sectionId);
      const next = list[0];
      setTimetableId(next ? String(next.id) : '');
      await refreshAll();
    } catch {
      toast.error(t('timetable.deleteError'));
    } finally {
      setDeleteTimetableId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-none h-full">
      <div className="px-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-surface-900 dark:text-white">
            {t('timetable.adminTitle')}
          </h1>
          <p className="text-sm text-surface-500">{t('timetable.adminSubtitle')}</p>
        </div>
        <Button
          icon={faCalendarPlus}
          onClick={() => setCreateModalOpen(true)}
          className="shrink-0"
        >
          {t('timetable.newTimetable')}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-[calc(100vh-10rem)] rounded-2xl border border-surface-200/80 dark:border-surface-700/60 overflow-hidden bg-white dark:bg-surface-900 shadow-lg">
        <TimetableClassSidebar
          sections={sections}
          overview={overview}
          selectedId={sectionId}
          onSelect={(id) => {
            setSectionId(String(id));
            setTimetableId('');
            setGrid(null);
          }}
          loading={sidebarLoading}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface-50/50 dark:bg-surface-950/50">
          {!sectionId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarPlus} className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-surface-800 dark:text-surface-100">
                  {t('timetable.welcomeTitle')}
                </p>
                <p className="text-sm text-surface-500 mt-1 max-w-md">{t('timetable.welcomeHint')}</p>
              </div>
              <Button icon={faPlus} onClick={() => setCreateModalOpen(true)}>
                {t('timetable.newTimetable')}
              </Button>
            </div>
          ) : !hasActiveEditor ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-surface-800 dark:text-surface-100">
                  {selectedSection?.label}
                </p>
                <p className="text-sm text-surface-500 mt-1 max-w-md">{t('timetable.autoGenerateHint')}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  icon={faWandMagicSparkles}
                  onClick={handleAutoGenerate}
                  loading={actionBusy === 'generate'}
                  disabled={!!actionBusy}
                >
                  {t('timetable.autoGenerate')}
                </Button>
                <Button
                  variant="outline"
                  icon={faPlus}
                  onClick={() => setCreateModalOpen(true)}
                  disabled={!!actionBusy}
                >
                  {t('timetable.manualCreate')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <header className="shrink-0 px-4 py-3 border-b border-surface-200/80 dark:border-surface-700/60 bg-white dark:bg-surface-900">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                          {selectedSection?.label}
                        </h2>
                        {selectedTimetable?.is_published ? (
                          <Badge color="success" size="sm">{t('timetable.published')}</Badge>
                        ) : (
                          <Badge color="gray" size="sm">{t('timetable.draft')}</Badge>
                        )}
                        <span className="text-xs text-surface-500">
                          {sessionCount} {t('timetable.sessions')}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {selectedTimetable?.name}
                        {selectedTimetable?.academic_year && ` · ${selectedTimetable.academic_year}`}
                        {selectedTimetable?.semester && ` · ${selectedTimetable.semester}`}
                      </p>
                      <p className="text-[11px] text-surface-400 mt-1">{t('timetable.editorHint')}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        icon={faWandMagicSparkles}
                        onClick={() => {
                          if (sessionCount > 0) setRegenerateConfirm(true);
                          else handleAutoGenerate();
                        }}
                        disabled={!sectionId || !!actionBusy}
                        loading={actionBusy === 'generate'}
                      >
                        {sessionCount > 0 ? t('timetable.regenerate') : t('timetable.autoGenerate')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={faCopy}
                        onClick={handleDuplicate}
                        disabled={!timetableId || !!actionBusy}
                        loading={actionBusy === 'duplicate'}
                      >
                        {t('timetable.duplicate')}
                      </Button>
                      <Button
                        size="sm"
                        icon={faPaperPlane}
                        onClick={handlePublish}
                        disabled={!timetableId || !!actionBusy}
                        loading={actionBusy === 'publish'}
                      >
                        {t('timetable.publish')}
                      </Button>
                      <TimetablePrintBar timetableId={Number(timetableId)} label={selectedSection?.label} />
                      <Button
                        variant="outline"
                        size="sm"
                        icon={faTrash}
                        onClick={() => setDeleteTimetableId(timetableId)}
                        disabled={!timetableId}
                      >
                        {t('timetable.delete')}
                      </Button>
                    </div>
                  </div>

                  {timetables.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {timetables.map((tt) => (
                        <button
                          key={tt.id}
                          type="button"
                          onClick={() => setTimetableId(String(tt.id))}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border ${
                            String(timetableId) === String(tt.id)
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700'
                          }`}
                        >
                          {tt.is_published ? '★ ' : ''}
                          {tt.name?.slice(0, 32) || `#${tt.id}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </header>

              {(grid?.conflicts?.length ?? 0) > 0 && (
                <div className="shrink-0 mx-4 mt-3 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3">
                  <p className="text-sm font-semibold text-danger-700 dark:text-danger-300 flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                    {t('timetable.conflictsTitle', { count: grid.conflicts.length })}
                  </p>
                  <ul className="mt-1 text-xs text-danger-800/90 dark:text-danger-200/90 max-h-20 overflow-y-auto">
                    {grid.conflicts.map((c, i) => (
                      <li key={i}>• {c.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {generationSummary && (
                <div className="shrink-0 w-full max-w-none px-4 mt-3">
                  <TimetableGenerationSummary
                    summary={generationSummary}
                    onDismiss={() => setGenerationSummary(null)}
                  />
                </div>
              )}

              <div className="shrink-0 mx-4 mt-3">
                <TimetableRescheduleAdminPanel onReviewed={refreshAll} />
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-4 print:p-0">
                <EmploiDuTempsGrid
                  cells={grid?.cells ?? {}}
                  periods={grid?.periods}
                  days={grid?.days}
                  loading={gridLoading}
                  conflictKeys={conflictKeys}
                  conflictEntryIds={conflictIds}
                  dragEntryId={dragEntryId}
                  onDragEntryStart={setDragEntryId}
                  onCellDrop={handleCellDrop}
                  onAddSession={(slot) => setCellModal({ open: true, slot, isNew: true })}
                  onEditSession={(slot) => setCellModal({ open: true, slot, isNew: false })}
                  onDeleteSession={setDeleteSlot}
                />
              </div>
            </>
          )}
        </main>
      </div>

      <TimetableCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        sections={sections}
        sectionsLoading={sidebarLoading}
        sectionsError={sectionsError}
        onCreate={handleCreateTimetable}
        loading={saving}
        defaultSectionId={sectionId}
      />

      <TimetableCellEditor
        isOpen={cellModal.open}
        onClose={() => setCellModal({ open: false, slot: null, isNew: true })}
        slot={cellModal.slot}
        isNew={cellModal.isNew}
        courses={courses}
        teachers={teachers}
        onSave={handleSaveCell}
        onClear={() => {
          if (cellModal.slot?.cell) setDeleteSlot(cellModal.slot);
        }}
        loading={saving}
      />

      <ConfirmDialog
        isOpen={!!deleteSlot?.cell?.id}
        onClose={() => setDeleteSlot(null)}
        onConfirm={handleDeleteCell}
        title={t('timetable.deleteSessionTitle')}
        message={t('timetable.deleteSessionMessage')}
      />

      <ConfirmDialog
        isOpen={!!deleteTimetableId}
        onClose={() => setDeleteTimetableId(null)}
        onConfirm={handleDeleteTimetable}
        title={t('timetable.deleteConfirmTitle')}
        message={t('timetable.deleteConfirmMessage')}
      />

      <ConfirmDialog
        isOpen={regenerateConfirm}
        onClose={() => setRegenerateConfirm(false)}
        onConfirm={handleAutoGenerate}
        title={t('timetable.regenerateConfirmTitle')}
        message={t('timetable.regenerateConfirmMessage')}
      />
    </div>
  );
}
