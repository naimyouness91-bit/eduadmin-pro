import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faUsers,
  faChalkboardTeacher,
  faBook,
  faEnvelope,
  faSpinner,
  faClockRotateLeft,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { searchAPI } from '../../services/api';
import { useAuthStore } from '../../store';

const ICONS = {
  student: faUsers,
  teacher: faChalkboardTeacher,
  course: faBook,
  message: faEnvelope,
};

const RECENT_KEY = 'eduadmin_recent_searches';
const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecent(term) {
  const t = term.trim();
  if (t.length < MIN_CHARS) return;
  try {
    const list = loadRecent().filter((x) => x !== t);
    localStorage.setItem(RECENT_KEY, JSON.stringify([t, ...list].slice(0, 5)));
  } catch {
    /* ignore */
  }
}

export default function GlobalSearch({ className = '' }) {
  const { t } = useTranslation();
  const { hasRole } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState(null);
  const [recent, setRecent] = useState(loadRecent);

  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    const items = [
      { label: t('globalSearchPage.suggestStudents'), icon: faUsers, hint: t('globalSearchPage.hintStudents') },
      { label: t('globalSearchPage.suggestTeachers'), icon: faChalkboardTeacher, hint: t('globalSearchPage.hintTeachers') },
      { label: t('globalSearchPage.suggestCourses'), icon: faBook, hint: t('globalSearchPage.hintCourses') },
      { label: t('globalSearchPage.suggestMessages'), icon: faEnvelope, hint: t('globalSearchPage.hintMessages') },
    ];
    if (!hasRole('super_admin', 'admin')) {
      return items.filter((s) => s.icon !== faChalkboardTeacher);
    }
    if (hasRole('student')) {
      return items.filter((s) => s.icon === faBook || s.icon === faEnvelope);
    }
    if (hasRole('parent')) {
      return items.filter((s) => s.icon !== faChalkboardTeacher);
    }
    return items;
  }, [hasRole, t]);

  const groupLabels = useMemo(() => ({
    students: t('globalSearchPage.groupStudents'),
    teachers: t('globalSearchPage.groupTeachers'),
    courses: t('globalSearchPage.groupCourses'),
    messages: t('globalSearchPage.groupMessages'),
  }), [t]);

  const groups = useMemo(() => {
    if (!results) return [];
    return [
      { key: 'students', label: groupLabels.students, items: results.students ?? [] },
      { key: 'teachers', label: groupLabels.teachers, items: results.teachers ?? [] },
      { key: 'courses', label: groupLabels.courses, items: results.courses ?? [] },
      { key: 'messages', label: groupLabels.messages, items: results.messages ?? [] },
    ].filter((g) => g.items.length > 0);
  }, [results, groupLabels]);

  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.key }))),
    [groups]
  );

  const total = results?.total ?? 0;
  const trimmed = query.trim();
  const showPanel = open && (trimmed.length > 0 || suggestions.length > 0);
  const canSearch = trimmed.length >= MIN_CHARS;

  const updatePanelPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 320),
      maxWidth: 'min(28rem, calc(100vw - 1rem))',
      zIndex: 220,
    });
  }, []);

  const runSearch = useCallback(async (q) => {
    const term = q.trim();
    if (term.length < MIN_CHARS) {
      setResults(null);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestIdRef.current;

    setLoading(true);
    try {
      const { data } = await searchAPI.query(term, { limit: 6, signal: controller.signal });
      if (id !== requestIdRef.current) return;
      setResults(data);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      if (id !== requestIdRef.current) return;
      setResults({ students: [], teachers: [], courses: [], messages: [], total: 0, query: term });
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (results?.total > 0) setActiveIndex(0);
    else setActiveIndex(-1);
  }, [results]);

  useEffect(() => {
    if (!canSearch) {
      setResults(null);
      setLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, canSearch, runSearch]);

  useLayoutEffect(() => {
    if (!showPanel) {
      setPanelStyle(null);
      return undefined;
    }
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [showPanel, updatePanelPosition, query]);

  useEffect(() => {
    const onClick = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-global-search-panel]')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pick = (item, term) => {
    if (term?.trim()) {
      saveRecent(term.trim());
      setRecent(loadRecent());
    }
    setOpen(false);
    setQuery('');
    setResults(null);
    setActiveIndex(-1);
    navigate(item.url);
  };

  const applyRecent = (term) => {
    setQuery(term);
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!showPanel) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (!canSearch || flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && flatItems[activeIndex]) {
      e.preventDefault();
      pick(flatItems[activeIndex], trimmed);
    }
  };

  const panel = showPanel && panelStyle && (
    <div
      data-global-search-panel
      style={panelStyle}
      className="rounded-xl border border-surface-200/80 dark:border-surface-700/80 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.18)] overflow-hidden animate-dropdown-down"
      role="listbox"
      aria-label={t('globalSearchPage.ariaResults')}
    >
      {!canSearch && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-surface-500 text-center">
            {t('globalSearchPage.startTyping')}
          </p>
          {recent.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 px-1 mb-1.5">
                {t('globalSearchPage.recent')}
              </p>
              <ul className="space-y-0.5">
                {recent.map((term) => (
                  <li key={term}>
                    <button
                      type="button"
                      onClick={() => applyRecent(term)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-300 hover:bg-primary-500/10 transition-colors text-start"
                    >
                      <FontAwesomeIcon icon={faClockRotateLeft} className="w-3.5 h-3.5 text-surface-400" />
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 px-1 mb-1.5">
              {t('globalSearchPage.suggestions')}
            </p>
            <ul className="space-y-1">
              {suggestions.map((s) => (
                <li
                  key={s.label}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg text-surface-500 dark:text-surface-400"
                >
                  <FontAwesomeIcon icon={s.icon} className="w-3.5 h-3.5 mt-0.5 text-primary-500/80" />
                  <div>
                    <p className="text-xs font-medium text-surface-600 dark:text-surface-300">{s.label}</p>
                    <p className="text-[10px] text-surface-400">{s.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {canSearch && loading && !results && (
        <div className="p-6 flex flex-col items-center gap-2 text-surface-400">
          <FontAwesomeIcon icon={faSpinner} spin className="w-5 h-5 text-primary-500" />
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      )}

      {canSearch && results && !loading && total === 0 && (
        <div className="p-8 text-center">
          <FontAwesomeIcon icon={faSearch} className="w-8 h-8 text-surface-300 dark:text-surface-600 mb-3" />
          <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{t('globalSearchPage.noResultsTitle')}</p>
          <p className="text-xs text-surface-400 mt-1">
            {t('globalSearchPage.noResultsHint', { query: trimmed })}
          </p>
        </div>
      )}

      {canSearch && results && total > 0 && (
        <div className="max-h-[min(20rem,50vh)] overflow-y-auto py-1">
          {groups.map((group) => (
            <div key={group.key} className="py-1">
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-400 sticky top-0 bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm">
                {group.label}
              </p>
              {group.items.map((item) => {
                const idx = flatItems.findIndex((f) => f.id === item.id && f.group === group.key);
                const active = idx === activeIndex;
                return (
                  <button
                    key={`${group.key}-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => pick(item, trimmed)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors',
                      active
                        ? 'bg-primary-500/15 text-primary-700 dark:text-primary-200'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-800/80',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        active ? 'bg-primary-500/20' : 'bg-surface-100 dark:bg-surface-800',
                      ].join(' ')}
                    >
                      <FontAwesomeIcon
                        icon={ICONS[item.type] || faSearch}
                        className={`w-3.5 h-3.5 ${active ? 'text-primary-500' : 'text-surface-400'}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-surface-400 truncate">{item.subtitle}</p>
                    </div>
                    {active && (
                      <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 text-primary-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {canSearch && results && total > 0 && (
        <p className="px-4 py-2 text-[10px] text-surface-400 border-t border-surface-100 dark:border-surface-800 text-center">
          {t('globalSearchPage.resultsFooter', {
            count: total,
            hint: t('globalSearchPage.navigateHint'),
          })}
        </p>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <FontAwesomeIcon
        icon={loading ? faSpinner : faSearch}
        spin={loading}
        className="absolute start-3.5 top-1/2 -translate-y-1/2 text-surface-400 w-4 h-4 pointer-events-none z-[1]"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t('globalSearchPage.placeholder')}
        aria-label={t('globalSearchPage.ariaGlobalSearch')}
        aria-expanded={showPanel}
        aria-autocomplete="list"
        autoComplete="off"
        className="w-full bg-surface-100 dark:bg-surface-800 rounded-xl ps-10 pe-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 placeholder-surface-400 outline-none focus:ring-2 focus:ring-primary-500/30 border border-transparent focus:border-primary-500/50 transition-all"
      />
      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}
    </div>
  );
}
