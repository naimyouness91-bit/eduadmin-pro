import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faUsers,
  faBookOpen,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';

const STATS = [
  { icon: faUsers, label: 'Active users', value: '2.4k+' },
  { icon: faBookOpen, label: 'Courses managed', value: '180+' },
  { icon: faChartLine, label: 'Avg. attendance', value: '94%' },
];

export default function AuthSplitLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-50 dark:bg-surface-950">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[48%] relative overflow-hidden bg-gradient-primary p-12 flex-col justify-between">
        <div className="absolute inset-0 bg-mesh-gradient opacity-60" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-secondary-500/20 blur-3xl" />

        <div className="relative z-10">
          <Link to="/login" className="inline-flex items-center gap-3 text-white">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <FontAwesomeIcon icon={faGraduationCap} className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">EduAdmin Pro</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold text-white leading-tight">
              {title}
            </h2>
            <p className="mt-4 text-primary-100 text-lg max-w-md">{subtitle}</p>
          </div>

          <div className="grid gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/10"
              >
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <FontAwesomeIcon icon={stat.icon} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-primary-100/90">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-primary-100/70">
          © {new Date().getFullYear()} EduAdmin Pro. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
