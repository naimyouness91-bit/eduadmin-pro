import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FloatingMenu from './FloatingMenu';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import {
  modalBackdropVariants,
  modalPanelVariants,
  cardVariants,
  tableRowVariants,
  staggerContainer,
  staggerItem,
  useMotionTransition,
} from '../../motion';
import { faTimes, faSpinner, faChevronUp, faChevronDown, faSearch, faFilter, faDownload, faPlus, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

function AnimatedStatValue({ value }) {
  const raw = value ?? '';
  const isNumeric = typeof raw === 'number' || (typeof raw === 'string' && /^\d[\d,.\s]*$/.test(String(raw).trim()));
  const target = isNumeric ? Number(String(raw).replace(/[^\d.]/g, '')) : 0;
  const animated = useAnimatedCounter(target, 650);
  if (!isNumeric || Number.isNaN(target)) return raw;
  return animated.toLocaleString();
}

const glassSurface =
  'bg-white/80 dark:bg-surface-900/75 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-[0_8px_30px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300';

// ─── StatCard ──────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon, color = 'primary', trend, trendLabel, loading, index = 0 }) {
  const transition = useMotionTransition(0.32);
  const colorMap = {
    primary: { bg: 'bg-primary-500/10 dark:bg-primary-500/20', icon: 'text-primary-500', border: 'border-primary-500/20' },
    success: { bg: 'bg-success-500/10 dark:bg-success-500/20', icon: 'text-success-500', border: 'border-success-500/20' },
    warning: { bg: 'bg-warning-500/10 dark:bg-warning-500/20', icon: 'text-warning-500', border: 'border-warning-500/20' },
    danger:  { bg: 'bg-danger-500/10 dark:bg-danger-500/20',  icon: 'text-danger-500',  border: 'border-danger-500/20'  },
    info:    { bg: 'bg-info-500/10 dark:bg-info-500/20',      icon: 'text-info-500',    border: 'border-info-500/20'    },
    purple:  { bg: 'bg-purple-500/10 dark:bg-purple-500/20',  icon: 'text-purple-500',  border: 'border-purple-500/20'  },
  };
  const c = colorMap[color] || colorMap.primary;

  if (loading) return (
    <div className={`${glassSurface} rounded-2xl p-6 animate-pulse h-full`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-surface-200 dark:bg-surface-700 rounded" />
        <div className="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded-xl" />
      </div>
      <div className="h-8 w-16 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
      <div className="h-3 w-32 bg-surface-200 dark:bg-surface-700 rounded" />
    </div>
  );

  return (
    <motion.div
      className={`${glassSurface} rounded-2xl ${c.border} p-4 sm:p-6 h-full group`}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      transition={{ ...transition, delay: index * 0.06 }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.22 } }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{title}</p>
        <motion.div
          className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}
          whileHover={{ scale: 1.1, rotate: 3 }}
          transition={{ duration: 0.2 }}
        >
          <FontAwesomeIcon icon={icon} className={`${c.icon} w-4 h-4`} />
        </motion.div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display font-bold text-2xl sm:text-3xl text-surface-900 dark:text-white tabular-nums">
            <AnimatedStatValue value={value} />
          </p>
          {subtitle && <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{subtitle}</p>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-success-500/10 text-success-600 dark:text-success-400' : 'bg-danger-500/10 text-danger-600 dark:text-danger-400'}`}>
            <FontAwesomeIcon icon={trend >= 0 ? faChevronUp : faChevronDown} className="w-3 h-3" />
            {Math.abs(trend)}%
            {trendLabel && <span className="text-surface-400 font-normal ms-1">{trendLabel}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Badge ─────────────────────────────────────────────────────
export function Badge({ children, color = 'primary', size = 'sm', dot }) {
  const colorMap = {
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    success: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300',
    danger:  'bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300',
    info:    'bg-info-100 text-info-700 dark:bg-info-900/40 dark:text-info-300',
    purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    gray:    'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
  };
  const sizeMap = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2.5 py-1', md: 'text-sm px-3 py-1.5' };
  const dotColor = { primary:'bg-primary-500', success:'bg-success-500', warning:'bg-warning-500', danger:'bg-danger-500', info:'bg-info-500', purple:'bg-purple-500', gray:'bg-surface-400' };

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${colorMap[color]} ${sizeMap[size]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor[color]}`} />}
      {children}
    </span>
  );
}

// ─── Modal ─────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  const { t } = useTranslation();
  const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', form: 'max-w-[760px]', xl: 'max-w-4xl', full: 'max-w-6xl' };

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const reduced = useReducedMotion();
  const backdropTransition = useMotionTransition(0.28);
  const panelTransition = useMotionTransition(0.34);

  const modal = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-root"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition}
        >
          <motion.div
            className="absolute inset-0 bg-surface-950/55 dark:bg-black/65 backdrop-blur-md"
            variants={modalBackdropVariants}
            initial={reduced ? false : 'initial'}
            animate="animate"
            exit="exit"
            transition={backdropTransition}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            variants={modalPanelVariants}
            initial={reduced ? false : 'initial'}
            animate="animate"
            exit="exit"
            transition={{ ...panelTransition, ease: [0.16, 1, 0.3, 1] }}
          className={`relative z-10 flex w-full modal-safe max-h-[92dvh] sm:max-h-[85vh] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-surface-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)] dark:border-surface-600/30 dark:bg-surface-900 dark:shadow-[0_24px_80px_-16px_rgba(0,0,0,0.65)] ${sizeMap[size]}`}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-surface-200/80 bg-white/95 px-5 py-4 dark:border-surface-700/60 dark:bg-surface-900/95 sm:px-6 sm:py-5">
              <h3 id="modal-title" className="font-display text-lg font-semibold tracking-tight text-surface-900 dark:text-white sm:text-xl">{title}</h3>
              <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-xl p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-white">
                <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-6 sm:py-6">{children}</div>
            {footer && (
              <div className="flex-shrink-0 border-t border-surface-200/80 bg-surface-50/80 px-4 py-3 backdrop-blur-sm dark:border-surface-700/60 dark:bg-surface-950/40 sm:px-6 sm:py-5">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}

// ─── ConfirmDialog ─────────────────────────────────────────────
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  subjectName,
  description,
  confirmLabel,
  confirmColor = 'danger',
  loading = false,
}) {
  const { t } = useTranslation();
  const isDanger = confirmColor === 'danger';
  const resolvedConfirmLabel = confirmLabel ?? t('common.delete');

  const bodyMessage = subjectName ? (
    <div className="space-y-3 text-center">
      <p className="text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">
        {t('common.confirmDeletePrompt')}
      </p>
      <p className="font-display text-lg font-semibold tracking-tight text-surface-900 dark:text-white">
        <span className="text-danger-600 dark:text-danger-400">&ldquo;</span>
        {subjectName}
        <span className="text-danger-600 dark:text-danger-400">&rdquo;</span>
      </p>
      {description && (
        <p className="text-sm leading-relaxed text-surface-500 dark:text-surface-400">{description}</p>
      )}
    </div>
  ) : (
    <p className="text-center text-[15px] leading-relaxed text-surface-600 dark:text-surface-300">{message}</p>
  );

  const handleClose = () => {
    if (!loading) onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm font-semibold text-surface-700 transition-all duration-200 hover:bg-surface-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700 sm:flex-none sm:min-w-[7.5rem]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              'inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:min-w-[9.5rem]',
              isDanger
                ? 'bg-danger-500 hover:bg-danger-600 hover:shadow-[0_4px_20px_rgba(239,68,68,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900'
                : 'bg-primary-500 hover:bg-primary-600 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900',
            ].join(' ')}
          >
            {loading && <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" aria-hidden />}
            {resolvedConfirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center px-1 pb-1 pt-2 text-center sm:px-2">
        <div
          className={[
            'relative mb-5 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl',
            isDanger
              ? 'bg-danger-50 ring-1 ring-danger-200/80 dark:bg-danger-950/50 dark:ring-danger-500/30'
              : 'bg-primary-50 ring-1 ring-primary-200/80 dark:bg-primary-950/50 dark:ring-primary-500/30',
          ].join(' ')}
          aria-hidden
        >
          <div
            className={[
              'absolute inset-0 rounded-2xl opacity-60 blur-md',
              isDanger ? 'bg-danger-400/25' : 'bg-primary-400/25',
            ].join(' ')}
          />
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className={[
              'relative h-7 w-7',
              isDanger ? 'text-danger-500 dark:text-danger-400' : 'text-primary-500 dark:text-primary-400',
            ].join(' ')}
          />
        </div>
        {bodyMessage}
      </div>
    </Modal>
  );
}

// ─── Table ─────────────────────────────────────────────────────
export function Table({ columns, data, loading, emptyMessage, onRowClick, mobileCards = true }) {
  const { t } = useTranslation();
  const rowTransition = useMotionTransition(0.28);
  const empty = emptyMessage ?? t('common.noDataFound');
  const tableKey = data.map((row, i) => row.id ?? i).join('-');

  if (loading) return (
    <div className="space-y-3 p-4 sm:p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="h-12 bg-surface-100 dark:bg-surface-800 rounded-xl"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...rowTransition, delay: i * 0.05 }}
        />
      ))}
    </div>
  );

  const renderCell = (col, row) => (col.render ? col.render(row[col.key], row) : row[col.key]);

  return (
    <>
      <div className="desktop-table-only responsive-table-wrap">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700">
              {columns.map(col => (
                <th key={col.key} className="text-start text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider px-3 sm:px-4 py-3 first:ps-4 sm:first:ps-6 last:pe-4 sm:last:pe-6">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <AnimatePresence mode="popLayout">
            <motion.tbody
              key={tableKey}
              className="divide-y divide-surface-100 dark:divide-surface-800"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-surface-400 dark:text-surface-500">{empty}</td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <motion.tr
                    key={row.id || i}
                    variants={tableRowVariants}
                    transition={{ ...rowTransition, delay: i * 0.03 }}
                    onClick={() => onRowClick?.(row)}
                    className={`group transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50' : ''}`}
                    whileHover={onRowClick ? { x: 2, transition: { duration: 0.15 } } : undefined}
                  >
                    {columns.map(col => (
                      <td key={col.key} className="px-3 sm:px-4 py-3.5 first:ps-4 sm:first:ps-6 last:pe-4 sm:last:pe-6 text-sm text-surface-700 dark:text-surface-300">
                        {renderCell(col, row)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>

      {mobileCards && (
        <div className="mobile-data-cards">
          {data.length === 0 ? (
            <p className="text-center py-12 text-surface-400 dark:text-surface-500 text-sm">{empty}</p>
          ) : (
            data.map((row, i) => (
              <div
                key={row.id || i}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                className={`mobile-data-card ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <div key={col.key} className="mobile-data-card__row">
                    <span className="mobile-data-card__label">{col.label}</span>
                    <span className="mobile-data-card__value">{renderCell(col, row)}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

// ─── Pagination ────────────────────────────────────────────────
export function Pagination({ meta, onPageChange }) {
  const { t } = useTranslation();
  if (!meta || meta.last_page <= 1) return null;
  const { current_page, last_page, from, to, total } = meta;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t border-surface-200 dark:border-surface-700">
      <p className="text-sm text-surface-500 dark:text-surface-400 text-center sm:text-start">
        {t('common.showingRange', { from, to, total })}
      </p>
      <div className="flex items-center justify-center gap-1 flex-wrap">
        <button onClick={() => onPageChange(current_page - 1)} disabled={current_page === 1}
          className="px-3 py-1.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {t('common.previous')}
        </button>
        {Array.from({ length: Math.min(5, last_page) }, (_, i) => {
          let page = i + 1;
          if (last_page > 5) {
            if (current_page <= 3) page = i + 1;
            else if (current_page >= last_page - 2) page = last_page - 4 + i;
            else page = current_page - 2 + i;
          }
          return (
            <button key={page} onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === current_page ? 'bg-primary-500 text-white' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'}`}>
              {page}
            </button>
          );
        })}
        <button onClick={() => onPageChange(current_page + 1)} disabled={current_page === last_page}
          className="px-3 py-1.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}

// ─── SearchBar ─────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder, className = '' }) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('common.search');
  return (
    <div className={`relative ${className}`}>
      <FontAwesomeIcon icon={faSearch} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-surface-400 w-4 h-4" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={resolvedPlaceholder}
        className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl ps-10 pe-4 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors" />
    </div>
  );
}

// ─── FormField ─────────────────────────────────────────────────
export function FormField({ label, error, required, children, hint }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          {label}{required && <span className="text-danger-500 ms-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-surface-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Input ─────────────────────────────────────────────────────
export function Input({ error, className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full bg-surface-50 dark:bg-surface-800 border ${error ? 'border-danger-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors ${className}`}
    />
  );
}

// ─── Select ────────────────────────────────────────────────────
export function Select({ error, children, className = '', ...props }) {
  return (
    <select
      {...props}
      className={`w-full bg-surface-50 dark:bg-surface-800 border ${error ? 'border-danger-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors ${className}`}>
      {children}
    </select>
  );
}

// ─── Textarea ──────────────────────────────────────────────────
export function Textarea({ error, className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full bg-surface-50 dark:bg-surface-800 border ${error ? 'border-danger-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors resize-none ${className}`}
    />
  );
}

// ─── Button ────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, icon, className = '', ...props }) {
  const variants = {
    primary:
      'bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-400 hover:to-primary-600 text-white ' +
      'shadow-glow hover:shadow-[0_6px_28px_rgb(var(--color-primary-500)/0.45)]',
    secondary: 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300',
    danger:    'bg-danger-500 hover:bg-danger-600 text-white',
    success:   'bg-success-500 hover:bg-success-600 text-white',
    ghost:     'hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400',
    outline:   'border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  };
  const iconSizes = { sm: 'w-3 h-3', md: 'w-3.5 h-3.5', lg: 'w-4 h-4' };

  return (
    <motion.button
      {...props}
      disabled={loading || props.disabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-xl',
        'transition-colors duration-200 ease-out',
        'w-auto max-w-full shrink-0 whitespace-nowrap',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      whileHover={props.disabled || loading ? undefined : { scale: 1.02, y: -1 }}
      whileTap={props.disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {loading ? (
        <FontAwesomeIcon icon={faSpinner} className={`${iconSizes[size]} animate-spin`} />
      ) : (
        icon && <FontAwesomeIcon icon={icon} className={iconSizes[size]} aria-hidden />
      )}
      {children}
    </motion.button>
  );
}

// ─── PageHeader ────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, breadcrumb }) {
  const transition = useMotionTransition(0.3);
  return (
    <motion.div
      className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      <div className="min-w-0 flex-1">
        {breadcrumb && <p className="text-xs text-surface-400 mb-1">{breadcrumb}</p>}
        <h1 className="font-display font-bold text-xl sm:text-2xl text-surface-900 dark:text-white break-words">{title}</h1>
        {subtitle && <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="responsive-actions sm:justify-end">
          {actions}
        </div>
      )}
    </motion.div>
  );
}

// ─── Card ──────────────────────────────────────────────────────
export function Card({ children, title, subtitle, actions, className = '', padding = true, noBorder, index = 0, animated = true }) {
  const transition = useMotionTransition(0.32);
  const Wrapper = animated ? motion.div : 'div';
  const motionProps = animated
    ? {
        variants: cardVariants,
        initial: 'initial',
        animate: 'animate',
        transition: { ...transition, delay: index * 0.06 },
        whileHover: { y: -4, scale: 1.01, transition: { duration: 0.22 } },
      }
    : {};

  return (
    <Wrapper {...motionProps} className={`${glassSurface} rounded-2xl flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-100/80 dark:border-surface-800/80 shrink-0">
          <div className="min-w-0">
            {title && <h3 className="font-semibold text-surface-900 dark:text-white text-sm">{title}</h3>}
            {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && (
            <div className="responsive-actions sm:justify-end">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={`${padding ? 'p-4 sm:p-6' : ''} flex-1 min-h-0 min-w-0`.trim()}>{children}</div>
    </Wrapper>
  );
}

// ─── Avatar ────────────────────────────────────────────────────
export function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return src ? (
    <img src={src} alt={name} className={`${sizes[size]} rounded-xl object-cover flex-shrink-0 ${className}`} />
  ) : (
    <div className={`${sizes[size]} rounded-xl bg-gradient-primary flex items-center justify-center font-semibold text-white flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

// ─── GradeBadge ────────────────────────────────────────────────
export function GradeTag({ grade, percentage }) {
  const getColor = (pct) => {
    if (pct >= 90) return 'success';
    if (pct >= 75) return 'primary';
    if (pct >= 60) return 'warning';
    return 'danger';
  };
  return <Badge color={getColor(percentage)}>{grade} ({percentage}%)</Badge>;
}

// ─── AttendanceBadge ───────────────────────────────────────────
export function AttendanceBadge({ status }) {
  const { t } = useTranslation();
  const map = {
    present: ['success', t('common.present')],
    absent: ['danger', t('common.absent')],
    late: ['warning', t('common.late')],
    excused: ['info', t('common.excused')],
  };
  const [color, label] = map[status] || ['gray', status];
  return <Badge color={color} dot>{label}</Badge>;
}

// ─── EmptyState ────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  const transition = useMotionTransition(0.35);
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
        {icon && <FontAwesomeIcon icon={icon} className="text-surface-400 w-6 h-6" />}
      </div>
      <h3 className="font-semibold text-surface-700 dark:text-surface-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-surface-400 max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────
export function Skeleton({ className = '', lines = 1 }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse" style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }} />
      ))}
    </div>
  );
}

// ─── ProgressBar ───────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'primary', size = 'md', label, showValue }) {
  const percentage = Math.min(100, Math.round((value / max) * 100));
  const colorMap = { primary: 'bg-primary-500', success: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500', info: 'bg-info-500' };
  const sizeMap = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-surface-500">{label}</span>}
          {showValue && <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-surface-100 dark:bg-surface-800 rounded-full ${sizeMap[size]}`}>
        <div className={`${sizeMap[size]} rounded-full ${colorMap[color]} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// ─── Tooltip ───────────────────────────────────────────────────
export function Tooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && content && (
        <div className={`absolute z-50 px-2.5 py-1.5 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none ${position === 'top' ? 'bottom-full mb-1.5 left-1/2 -translate-x-1/2' : 'top-full mt-1.5 left-1/2 -translate-x-1/2'}`}>
          {content}
        </div>
      )}
    </div>
  );
}

// ─── Tab Component ─────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="responsive-tabs bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${active === tab.key ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm' : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'}`}>
          {tab.icon && <FontAwesomeIcon icon={tab.icon} className="w-3.5 h-3.5" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active === tab.key ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'bg-surface-200 dark:bg-surface-700 text-surface-500'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── DropdownMenu ──────────────────────────────────────────────
export function DropdownMenu({ trigger, items, preferAbove = true }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <div ref={triggerRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      >
        {trigger}
      </div>
      <FloatingMenu
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        preferAbove={preferAbove}
      >
        {items.map((item, i) =>
          item.divider ? (
            <div key={i} className="border-t border-surface-100 dark:border-surface-700 my-1" />
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${item.danger ? 'text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20' : 'text-surface-700 dark:text-surface-300 hover:bg-primary-500/10 dark:hover:bg-primary-500/10'}`}
            >
              {item.icon && <FontAwesomeIcon icon={item.icon} className="w-4 h-4 text-surface-400" />}
              {item.label}
            </button>
          )
        )}
      </FloatingMenu>
    </div>
  );
}