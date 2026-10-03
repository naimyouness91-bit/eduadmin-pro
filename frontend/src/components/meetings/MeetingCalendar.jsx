import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function MeetingCalendar({ events = [] }) {
  const { t } = useTranslation();
  const byDay = events.reduce((acc, ev) => {
    if (!ev.scheduled_at) return acc;
    const key = dayKey(new Date(ev.scheduled_at));
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const days = Object.keys(byDay).sort();

  if (!days.length) {
    return <p className="text-sm text-surface-500 p-4">{t('meetingsPage.noCalendarMeetings')}</p>;
  }

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={day} className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <div className="px-4 py-2 bg-surface-50 dark:bg-surface-800 text-sm font-medium">
            {new Date(day).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <ul className="divide-y divide-surface-100 dark:divide-surface-800">
            {byDay[day].map((m) => (
              <li key={m.id}>
                <Link
                  to={`/meetings/${m.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-primary-50/50 dark:hover:bg-primary-950/20"
                >
                  <span className="font-medium text-sm">{m.title}</span>
                  <span className="text-xs text-surface-500">
                    {new Date(m.scheduled_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
