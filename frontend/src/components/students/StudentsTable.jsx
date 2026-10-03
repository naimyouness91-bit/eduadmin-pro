import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { staggerContainer, tableRowVariants, useMotionTransition } from '../../motion';
import {
  faChevronUp,
  faChevronDown,
  faSort,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '../common/UI';

export default function StudentsTable({
  columns,
  data,
  loading,
  emptyMessage,
  emptyDescription,
  emptyAction,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
}) {
  const { t } = useTranslation();
  const rowTransition = useMotionTransition(0.28);
  const tableKey = data.map((row) => row.id).join('-');
  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(row.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={faUsers}
        title={emptyMessage || t('students.empty')}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const SortIcon = ({ col }) => {
    if (!col.sortKey) return null;
    if (sortBy !== col.sortKey) {
      return <FontAwesomeIcon icon={faSort} className="w-3 h-3 opacity-30 ms-1" />;
    }
    return (
      <FontAwesomeIcon
        icon={sortDir === 'asc' ? faChevronUp : faChevronDown}
        className="w-3 h-3 text-primary-500 ms-1"
      />
    );
  };

  return (
    <>
      <div className="desktop-table-only responsive-table-wrap">
        <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-surface-200 dark:border-surface-700">
            <th className="w-10 px-4 py-3 first:ps-6">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={(e) => onSelectAll?.(e.target.checked)}
                className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500/30"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-start text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider px-4 py-3 last:pe-6 ${
                  col.sortKey ? 'cursor-pointer select-none hover:text-primary-500 transition-colors' : ''
                }`}
                onClick={() => col.sortKey && onSort?.(col.sortKey)}
              >
                <span className="inline-flex items-center">
                  {col.label}
                  <SortIcon col={col} />
                </span>
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
          {data.map((row, i) => {
            const selected = selectedIds.includes(row.id);
            return (
              <motion.tr
                key={row.id}
                variants={tableRowVariants}
                transition={{ ...rowTransition, delay: i * 0.03 }}
                onClick={() => onRowClick?.(row)}
                className={`group transition-colors duration-150 ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${
                  selected
                    ? 'bg-primary-500/5 dark:bg-primary-500/10'
                    : 'hover:bg-surface-50 dark:hover:bg-surface-800/50 hover:shadow-sm'
                }`}
                whileHover={onRowClick ? { x: 2, transition: { duration: 0.15 } } : undefined}
              >
                <td className="px-4 py-3.5 first:ps-6" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onSelectRow?.(row.id)}
                    className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500/30"
                  />
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3.5 last:pe-6 text-sm text-surface-700 dark:text-surface-300"
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            );
          })}
          </motion.tbody>
        </AnimatePresence>
      </table>
      </div>

      <div className="mobile-data-cards">
        {data.map((row, i) => {
          const selected = selectedIds.includes(row.id);
          return (
            <div
              key={row.id}
              className={`mobile-data-card ${onRowClick ? 'cursor-pointer' : ''} ${
                selected ? 'bg-primary-500/5 dark:bg-primary-500/10' : ''
              }`}
              onClick={() => onRowClick?.(row)}
            >
              <div className="flex items-center gap-3 mb-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onSelectRow?.(row.id)}
                  className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-500/30"
                />
                <span className="text-xs font-semibold text-surface-400 uppercase">
                  {t('common.select', { defaultValue: 'Select' })}
                </span>
              </div>
              {columns.map((col) => (
                <div key={col.key} className="mobile-data-card__row">
                  <span className="mobile-data-card__label">{col.label}</span>
                  <span className="mobile-data-card__value">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
