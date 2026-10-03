import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faUsers, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';

export default function TimetableClassSidebar({
  sections = [],
  overview = [],
  selectedId,
  onSelect,
  loading = false,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const statsBySection = useMemo(() => {
    const map = {};
    overview.forEach((row) => {
      const id = row.class_section?.id;
      if (id) {
        map[id] = {
          entries: row.entries_count ?? 0,
          published: row.timetable?.is_published ?? false,
        };
      }
    });
    return map;
  }, [overview]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.label?.toLowerCase().includes(q) ||
        s.grade_level?.toLowerCase().includes(q) ||
        s.section?.toLowerCase().includes(q)
    );
  }, [sections, search]);

  const totalSessions = overview.reduce((sum, r) => sum + (r.entries_count ?? 0), 0);
  const publishedCount = overview.filter((r) => r.timetable?.is_published).length;

  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col border-r border-surface-200/80 dark:border-surface-700/60 bg-surface-50/80 dark:bg-surface-900/80">
      <div className="p-4 border-b border-surface-200/80 dark:border-surface-700/60">
        <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wide">
          {t('timetable.classesPanel')}
        </h2>
        <p className="text-xs text-surface-500 mt-1">{t('timetable.classesPanelHint')}</p>
        <div className="stat-cards-grid gap-2 mt-3" data-cols="2">
          <div className="rounded-lg bg-white dark:bg-surface-800 border border-surface-200/60 dark:border-surface-700/60 px-2.5 py-2">
            <p className="text-[10px] uppercase text-surface-400 font-semibold">{t('timetable.totalClasses')}</p>
            <p className="text-lg font-bold text-surface-900 dark:text-white">{sections.length}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-surface-800 border border-surface-200/60 dark:border-surface-700/60 px-2.5 py-2">
            <p className="text-[10px] uppercase text-surface-400 font-semibold">{t('timetable.published')}</p>
            <p className="text-lg font-bold text-emerald-600">{publishedCount}</p>
          </div>
        </div>
        <div className="relative mt-3">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('timetable.searchClasses')}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-200/80 dark:border-surface-700/60 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder:text-surface-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-200/60 dark:bg-surface-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-8 px-4">{t('timetable.noClassesFound')}</p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((section) => {
              const stats = statsBySection[section.id] ?? { entries: 0, published: false };
              const active = String(selectedId) === String(section.id);

              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(section.id)}
                    className={`w-full text-left rounded-xl px-3 py-3 transition-all border ${
                      active
                        ? 'bg-primary-500/15 border-primary-500/40 shadow-sm ring-1 ring-primary-500/20'
                        : 'bg-white dark:bg-surface-800 border-surface-200/60 dark:border-surface-700/50 hover:border-primary-300/50 hover:bg-primary-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-surface-900 dark:text-white truncate">
                          {section.label}
                        </p>
                        <p className="text-[11px] text-surface-500 mt-0.5">
                          {section.grade_level} · {t('timetable.section')} {section.section}
                        </p>
                      </div>
                      {stats.published && (
                        <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          {t('timetable.published')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-surface-500">
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendarCheck} className="w-3 h-3" />
                        {stats.entries} {t('timetable.slots')}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-3 border-t border-surface-200/80 dark:border-surface-700/60 text-[11px] text-surface-500 flex items-center gap-2">
        <FontAwesomeIcon icon={faUsers} className="w-3.5 h-3.5" />
        {totalSessions} {t('timetable.totalSessionsAcross')}
      </div>
    </aside>
  );
}
