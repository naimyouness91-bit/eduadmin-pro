import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { schedulesAPI } from '../../services/api';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { StudentPageShell, GlassCard } from '../../components/student/StudentUI';
import ScheduleToolbar from '../../components/schedule/ScheduleToolbar';
import ScheduleWeeklyGrid from '../../components/schedule/ScheduleWeeklyGrid';
import ScheduleDailyView from '../../components/schedule/ScheduleDailyView';
import ScheduleMonthlyView from '../../components/schedule/ScheduleMonthlyView';
import ScheduleDetailModal from '../../components/schedule/ScheduleDetailModal';
import ScheduleCard from '../../components/schedule/ScheduleCard';
import {
  groupByDay,
  getTodaySlots,
  getUpcomingSlots,
  getWeeklyTeachingHours,
  getWeeklySummary,
  todayIsoDay,
  SCHEDULE_DAYS,
  formatScheduleTime,
} from '../../utils/scheduleUtils';

export default function StudentSchedule() {
  const { t } = useTranslation();
  const { name } = useStudentProfile();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('week');
  const [selectedDay, setSelectedDay] = useState(todayIsoDay());
  const [selectedSlot, setSelectedSlot] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await schedulesAPI.list({ active_only: true });
      setSchedules(data.data ?? []);
    } catch {
      toast.error(t('studentPages.loadScheduleFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => groupByDay(schedules), [schedules]);
  const todaySlots = useMemo(() => getTodaySlots(schedules), [schedules]);
  const upcoming = useMemo(() => getUpcomingSlots(schedules, 6), [schedules]);
  const weeklySummary = useMemo(() => getWeeklySummary(schedules), [schedules]);
  const todayLabel = SCHEDULE_DAYS.find((d) => d.value === todayIsoDay())?.label ?? 'Today';

  const stats = useMemo(
    () => [
      { label: t('studentPages.statToday'), value: todaySlots.length },
      { label: t('studentPages.statThisWeek'), value: schedules.length },
      { label: t('studentPages.statHours'), value: getWeeklyTeachingHours(schedules) },
    ],
    [t, todaySlots.length, schedules]
  );

  return (
    <StudentPageShell
      title={t('studentPages.scheduleTitle')}
      subtitle={name ? t('studentPages.scheduleSubtitleNamed', { name }) : t('studentPages.scheduleSubtitleOwn')}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <GlassCard className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendarCheck} className="text-primary-500 w-4 h-4" />
              {t('studentPages.todaysClasses')}
            </h2>
            <span className="text-xs text-surface-500">{todayLabel}</span>
          </div>
          {loading ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}</div>
          ) : todaySlots.length ? (
            <ul className="space-y-2">
              {todaySlots.map((slot) => (
                <li key={slot.id}>
                  <ScheduleCard slot={slot} onClick={setSelectedSlot} compact showTeacher />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-500 text-center py-8">{t('studentPages.noClassesToday')}</p>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="font-semibold text-surface-900 dark:text-white mb-4">{t('studentPages.upcoming')}</h2>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}</div>
          ) : upcoming.length ? (
            <ul className="space-y-2">
              {upcoming.map((slot) => (
                <li key={`up-${slot.id}-${slot.day_of_week}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-surface-200/60 dark:border-surface-700/50 hover:bg-primary-500/5 text-left transition-colors"
                  >
                    <div className="text-center min-w-[48px]">
                      <p className="text-[10px] text-surface-500">{SCHEDULE_DAYS.find((d) => d.value === slot.day_of_week)?.short}</p>
                      <p className="text-xs font-mono text-primary-500">{formatScheduleTime(slot.start_time)}</p>
                    </div>
                    <p className="text-sm font-medium truncate flex-1">{slot.course?.name}</p>
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 text-surface-400" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-surface-500 text-center py-6">{t('studentPages.noUpcomingClasses')}</p>
          )}
        </GlassCard>
      </div>

      <div className="mb-4">
        <ScheduleToolbar view={view} onViewChange={setView} stats={stats} />
      </div>

      {view === 'week' && (
        <ScheduleWeeklyGrid
          byDay={byDay}
          loading={loading}
          onSlotClick={setSelectedSlot}
          showTeacher
        />
      )}
      {view === 'day' && (
        <ScheduleDailyView
          byDay={byDay}
          loading={loading}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          onSlotClick={setSelectedSlot}
          showTeacher
        />
      )}
      {view === 'month' && (
        <ScheduleMonthlyView byDay={byDay} onSlotClick={setSelectedSlot} />
      )}

      <GlassCard className="mt-6">
        <h3 className="font-semibold text-surface-900 dark:text-white mb-3">{t('studentPages.weeklySummary')}</h3>
        <div className="grid grid-cols-7 gap-2">
          {weeklySummary.map((day) => (
            <div
              key={day.value}
              className={`rounded-xl p-2 text-center border ${
                day.value === todayIsoDay()
                  ? 'border-primary-500/40 bg-primary-500/10'
                  : 'border-surface-200/60 dark:border-surface-700/50'
              }`}
            >
              <p className="text-[10px] font-semibold text-surface-500">{day.short}</p>
              <p className="text-lg font-display font-bold text-surface-900 dark:text-white">{day.count}</p>
              <p className="text-[9px] text-surface-400">{Math.round(day.minutes / 60 * 10) / 10}h</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <ScheduleDetailModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
    </StudentPageShell>
  );
}
