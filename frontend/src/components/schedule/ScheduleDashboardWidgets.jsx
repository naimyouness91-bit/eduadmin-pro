import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCalendarDay,
  faArrowRight,
  faChartSimple,
} from '@fortawesome/free-solid-svg-icons';
import { schedulesAPI, timetablesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { Card } from '../common/UI';
import { cellsToScheduleSlots } from '../../utils/timetableUtils';
import {
  getTodaySlots,
  getUpcomingSlots,
  getNextSession,
  getWeeklySummary,
  getWeeklyTeachingHours,
  formatScheduleTime,
  getTeacherName,
  getRoom,
  SCHEDULE_DAYS,
} from '../../utils/scheduleUtils';

function getClassSection(slot) {
  if (slot?.class_section?.label) return slot.class_section.label;
  const grade = slot?.class_section?.grade_level ?? slot?.course?.grade_level;
  const section = slot?.class_section?.section;
  if (grade && section) return `${grade} — ${section}`;
  return grade || '—';
}

function WidgetSkeleton() {
  return <div className="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />;
}

/** Max bar height (px) — fits inside the h-12 chart row without overflow */
const WEEKLY_BAR_MAX_PX = 36;

function weeklyBarHeight(count, maxCount) {
  if (!count || maxCount <= 0) return 4;
  const scaled = Math.round((count / maxCount) * WEEKLY_BAR_MAX_PX);
  return Math.min(Math.max(scaled, 4), WEEKLY_BAR_MAX_PX);
}

async function loadScheduleSlots(role) {
  if (role === 'student' || role === 'teacher') {
    const { data } = await timetablesAPI.mine();
    const payload = data?.data;
    if (!payload?.cells) return [];
    return cellsToScheduleSlots(payload.cells);
  }

  if (role === 'parent') {
    const { data } = await timetablesAPI.mine();
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.flatMap((item) => cellsToScheduleSlots(item?.cells ?? {}));
  }

  // Admin: legacy course-based slots (optional)
  const { data } = await schedulesAPI.list({ active_only: 1 });
  return data?.data ?? [];
}

export function ScheduleDashboardWidgets({
  compact = false,
  sessions: externalSessions = null,
  weeklyHours: externalWeeklyHours = null,
  weeklyTotalHours: externalWeeklyTotal = null,
  externalLoading = false,
  showClassDetails = false,
}) {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(externalSessions == null);

  const useExternal = externalSessions != null;

  const load = useCallback(async () => {
    if (useExternal) {
      setSchedules(externalSessions);
      setLoading(false);
      return;
    }

    if (!role) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const slots = await loadScheduleSlots(role);
      setSchedules(slots);
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.warn('[Schedule widgets] load failed', err?.response?.status, err?.response?.data);
      }
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [role, useExternal, externalSessions]);

  useEffect(() => {
    load();
  }, [load]);

  const isLoading = externalLoading || loading;

  const todaySlots = useMemo(() => getTodaySlots(schedules), [schedules]);
  const upcoming = useMemo(() => getUpcomingSlots(schedules, 4), [schedules]);
  const nextSession = useMemo(() => getNextSession(schedules), [schedules]);
  const weeklySummary = useMemo(() => getWeeklySummary(schedules), [schedules]);
  const totalHours = useMemo(() => {
    if (externalWeeklyTotal != null) return externalWeeklyTotal;
    if (externalWeeklyHours?.length) {
      return Math.round(externalWeeklyHours.reduce((s, d) => s + (Number(d.hours) || 0), 0) * 10) / 10;
    }
    return getWeeklyTeachingHours(schedules);
  }, [externalWeeklyTotal, externalWeeklyHours, schedules]);

  const weeklyChartData = useMemo(() => {
    if (externalWeeklyHours?.length) {
      return externalWeeklyHours.map((d) => ({
        value: d.day_of_week,
        label: d.label ?? SCHEDULE_DAYS.find((x) => x.value === d.day_of_week)?.label,
        short: d.short ?? SCHEDULE_DAYS.find((x) => x.value === d.day_of_week)?.short,
        count: d.sessions ?? 0,
        hours: Number(d.hours) || 0,
      }));
    }
    return weeklySummary.map((d) => ({ ...d, hours: d.count * 2 }));
  }, [externalWeeklyHours, weeklySummary]);

  const weeklyMax = useMemo(
    () => Math.max(...weeklyChartData.map((d) => d.hours), 0.5),
    [weeklyChartData]
  );

  if (compact) {
    return (
      <Card
        title={t('dashboard.todayTimetable')}
        actions={<Link to="/schedule" className="text-xs text-primary-500 hover:underline">{t('dashboard.fullSchedule')}</Link>}
      >
        {isLoading ? <WidgetSkeleton /> : todaySlots.length ? (
          <ul className="space-y-2">
            {todaySlots.slice(0, 4).map((slot) => (
              <li key={slot.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-surface-200/60 dark:border-surface-700/50">
                <div className="text-center min-w-[48px]">
                  <p className="text-xs font-mono text-primary-500">{formatScheduleTime(slot.start_time)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{slot.course?.name}</p>
                  <p className="text-xs text-surface-500">
                    {getRoom(slot)}
                    {showClassDetails ? ` · ${getClassSection(slot)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-surface-500 text-center py-6">{t('dashboard.noClassesToday')}</p>
        )}
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card
        title={t('dashboard.todayTimetable')}
        actions={
          <Link to="/schedule" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
            {t('dashboard.viewAll')}
            <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
          </Link>
        }
      >
        {isLoading ? <WidgetSkeleton /> : todaySlots.length ? (
          <ul className="space-y-2">
            {todaySlots.slice(0, 4).map((slot) => (
              <li key={slot.id} className="p-2.5 rounded-xl border border-surface-200/60 dark:border-surface-700/50 space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium text-sm">{slot.course?.name}</span>
                  <span className="text-xs font-mono text-primary-500 shrink-0">{formatScheduleTime(slot.start_time)}</span>
                </div>
                {showClassDetails && (
                  <p className="text-xs text-surface-500">
                    {getRoom(slot)} · {getClassSection(slot)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-surface-500 py-4 text-center">{t('dashboard.noClassesToday')}</p>
        )}
      </Card>

      <Card title={t('dashboard.upcomingClasses')}>
        {isLoading ? <WidgetSkeleton /> : upcoming.length ? (
          <ul className="space-y-2">
            {upcoming.slice(0, 4).map((slot) => (
              <li key={`${slot.id}-up`} className="text-sm">
                <p className="font-medium truncate">{slot.course?.name}</p>
                <p className="text-xs text-surface-500">
                  {SCHEDULE_DAYS.find((d) => d.value === slot.day_of_week)?.short} · {formatScheduleTime(slot.start_time)}
                  {showClassDetails ? ` · ${getRoom(slot)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-surface-500 py-4 text-center">{t('dashboard.noUpcomingClasses')}</p>
        )}
      </Card>

      <Card title={t('dashboard.nextSession')}>
        {isLoading ? <WidgetSkeleton /> : nextSession ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarDay} className="text-primary-500 w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">{nextSession.course?.name}</p>
                <p className="text-xs text-surface-500">
                  {SCHEDULE_DAYS.find((d) => d.value === nextSession.day_of_week)?.label} {t('common.at')} {formatScheduleTime(nextSession.start_time)}
                </p>
              </div>
            </div>
            <p className="text-xs text-surface-500 flex items-center gap-1">
              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
              {getRoom(nextSession)}
              {showClassDetails ? ` · ${getClassSection(nextSession)}` : ` · ${getTeacherName(nextSession)}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-surface-500 py-4 text-center">{t('dashboard.noUpcomingClasses')}</p>
        )}
      </Card>

      <Card title={t('dashboard.weeklySummary')}>
        {isLoading ? <WidgetSkeleton /> : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FontAwesomeIcon icon={faChartSimple} className="text-info-500 w-4 h-4" />
              <span className="text-2xl font-display font-bold">{totalHours}h</span>
              <span className="text-xs text-surface-500">{t('dashboard.weeklyTotalHours')}</span>
            </div>
            <div className="flex gap-1 items-end h-12 overflow-hidden">
              {weeklyChartData.map((d) => (
                <div key={d.value} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full rounded-t bg-primary-500/70 min-h-[4px] transition-all"
                    style={{ height: `${weeklyBarHeight(d.hours, weeklyMax)}px` }}
                    title={`${d.label}: ${d.hours}h`}
                  />
                  <span className="text-[8px] text-surface-400 shrink-0">{d.short?.charAt(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default ScheduleDashboardWidgets;
