import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faClipboardCheck,
  faChalkboardUser,
  faMedal,
  faBookOpen,
} from '@fortawesome/free-solid-svg-icons';

const ICONS = {
  bestClass: faTrophy,
  highestAttendance: faClipboardCheck,
  topTeacher: faChalkboardUser,
  topStudent: faMedal,
  mostUsedCourse: faBookOpen,
};

const INSIGHT_KEYS = [
  'bestClass',
  'highestAttendance',
  'topTeacher',
  'topStudent',
  'mostUsedCourse',
];

export default function AnalyticsInsights({ insights, loading }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {INSIGHT_KEYS.map((key) => {
        const item = insights?.[key];
        const icon = ICONS[key];
        return (
          <div
            key={key}
            className="rounded-2xl border border-surface-200/80 dark:border-surface-700/60 bg-white/80 dark:bg-surface-900/75 backdrop-blur-xl p-4 shadow-sm hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <FontAwesomeIcon icon={icon} className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">
                {t(`analytics.insight${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
              </p>
            </div>
            {loading ? (
              <div className="h-12 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
            ) : item ? (
              <>
                <p className="font-display font-bold text-xl text-surface-900 dark:text-white truncate">{item.value}</p>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mt-1 truncate">{item.name}</p>
                {item.meta && <p className="text-xs text-surface-500 mt-0.5">{item.meta}</p>}
              </>
            ) : (
              <p className="text-sm text-surface-400 py-2">{t('analytics.noDataYet')}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
