import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faRocket,
  faArrowRight,
  faSignInAlt,
  faChevronRight,
  faShieldHalved,
  faBolt,
  faHeadset,
  faUsers,
  faChalkboardTeacher,
  faBook,
  faClipboardCheck,
  faUserGraduate,
  faStar,
  faQrcode,
  faChartLine,
  faComments,
  faUserPlus,
  faDatabase,
  faChartBar,
  faFileExport,
  faQuoteLeft,
  faChevronUp,
  faBars,
  faTimes,
  faLocationDot,
  faPhone,
  faEnvelope,
  faGlobe,
  faPlayCircle,
} from '@fortawesome/free-solid-svg-icons';
import {
  faTwitter,
  faFacebook,
  faLinkedin,
  faYoutube,
  faInstagram,
} from '@fortawesome/free-brands-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLandingEffects } from '../../hooks/useLandingEffects';
import { useLandingTheme } from '../../hooks/useLandingTheme';
import LandingThemeToggle from '../../components/landing/LandingThemeToggle';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const LANDING_NAV = [
  { href: '#hero', key: 'nav.home' },
  { href: '#features', key: 'nav.features' },
  { href: '#about', key: 'nav.about' },
  { href: '#contact', key: 'nav.contact' },
];

const FEATURES = [
  { icon: faUserGraduate, title: 'Student Management', desc: 'Complete profiles, enrollment tracking, and guardian information.', color: '#6366f1' },
  { icon: faClipboardCheck, title: 'Attendance Tracking', desc: 'Manual, bulk, and QR code attendance with real-time reports.', color: '#f59e0b' },
  { icon: faStar, title: 'Exams & Grades', desc: 'Exams, quizzes, homework with auto averages and letter grades.', color: '#ec4899' },
  { icon: faChalkboardTeacher, title: 'Teacher Dashboard', desc: 'Course management, grading tools, and class scheduling.', color: '#10b981' },
  { icon: faChartLine, title: 'Analytics', desc: 'Real-time charts, trends, and performance leaderboards.', color: '#06b6d4' },
  { icon: faComments, title: 'Messaging System', desc: 'Direct chat between teachers, students, and parents.', color: '#8b5cf6' },
];

const STATS = [
  { target: '2400', plus: true, percent: false, label: 'Students Enrolled', icon: faUsers, color: '#6366f1' },
  { target: '180', plus: true, percent: false, label: 'Active Teachers', icon: faChalkboardTeacher, color: '#10b981' },
  { target: '320', plus: true, percent: false, label: 'Courses Available', icon: faBook, color: '#f59e0b' },
  { target: '98.2', plus: false, percent: true, label: 'Satisfaction Rate', icon: faClipboardCheck, color: '#06b6d4' },
];

const STEPS = [
  { num: '01', icon: faUserPlus, title: 'Admin Creates Accounts', desc: 'Your administrator sets up teacher and student access securely.', gradient: 'from-primary-500 to-indigo-600' },
  { num: '02', icon: faDatabase, title: 'Manage School Data', desc: 'Add students, teachers, courses and timetables in one place.', gradient: 'from-emerald-500 to-teal-600' },
  { num: '03', icon: faChartBar, title: 'Track Performance', desc: 'Monitor attendance and grades in real time.', gradient: 'from-amber-500 to-orange-500' },
  { num: '04', icon: faFileExport, title: 'Generate Reports', desc: 'Export professional PDFs and analytics on demand.', gradient: 'from-rose-500 to-pink-600' },
];

const TESTIMONIALS = [
  { name: 'Sarah Mitchell', role: 'Principal, Greenwood Academy', quote: 'EduAdmin Pro transformed how we manage our 1,200-student school. The QR attendance alone saved us hours daily.', gradient: 'from-primary-500 to-indigo-600' },
  { name: 'James Okonkwo', role: 'IT Director, Riverside High', quote: 'Within a week all 80 teachers were onboard. Role-based access gave our administration total peace of mind.', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'Dr. Linda Fernandez', role: 'Superintendent, Metro District', quote: 'Parent engagement improved 60% thanks to messaging. District-level visibility we desperately needed.', gradient: 'from-amber-500 to-orange-500' },
];

function BrandLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
        <FontAwesomeIcon icon={faGraduationCap} className="text-white text-sm" />
      </div>
      <span className="font-display font-bold text-lg">
        <span className="text-surface-900 dark:text-white">EduAdmin</span>
        <span className="text-primary-500">Pro</span>
      </span>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useLandingTheme();
  useLandingEffects();

  return (
    <div className="landing-page-root min-h-screen bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-100 transition-colors duration-300">
      {/* Navbar */}
      <nav id="landing-navbar" className="fixed top-0 left-0 right-0 z-50 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[4.5rem]">
            <a href="#hero"><BrandLogo /></a>
            <div className="hidden md:flex items-center gap-1">
              {LANDING_NAV.map(({ href, key }) => (
                <a key={href} href={href} className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors duration-300">
                  {t(key)}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher compact />
              <LandingThemeToggle className="shrink-0" />
              <Link to="/login" className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-medium border border-surface-200 dark:border-surface-700 bg-white/50 dark:bg-surface-900/50 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-300">
                {t('common.login')}
              </Link>
              <Link to="/login" className="hidden sm:inline-flex landing-btn-primary px-5 py-2 rounded-xl text-white text-sm font-semibold">
                {t('common.getStarted')}
              </Link>
              <button
                id="landing-menu-btn"
                type="button"
                className="md:hidden w-9 h-9 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center"
                aria-label="Menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((o) => !o)}
              >
                <FontAwesomeIcon icon={mobileOpen ? faTimes : faBars} />
              </button>
            </div>
          </div>
          <div id="landing-mobile-menu" className={`md:hidden border-t border-surface-200 dark:border-surface-800 ${mobileOpen ? 'landing-mobile-open' : ''}`}>
            <div className="py-4 space-y-1">
              {LANDING_NAV.map(({ href, key }) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className="landing-mobile-link block px-4 py-2.5 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-primary-600">
                  {t(key)}
                </a>
              ))}
              <div className="pt-3 px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3 pb-2">
                  <span className="text-xs font-medium text-surface-500">{t('common.language')}</span>
                  <LanguageSwitcher compact />
                </div>
                <div className="flex items-center justify-between gap-3 pb-2">
                  <span className="text-xs font-medium text-surface-500">{t('common.switchThemeDark')}</span>
                  <LandingThemeToggle />
                </div>
                <Link to="/login" className="text-center px-4 py-2.5 rounded-xl text-sm font-medium border border-surface-200 dark:border-surface-700 bg-white/50 dark:bg-surface-900/50 transition-colors duration-300">{t('common.login')}</Link>
                <Link to="/login" className="text-center landing-btn-primary px-4 py-2.5 rounded-xl text-white text-sm font-semibold">{t('common.getStarted')}</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden landing-hero-bg landing-dot-grid">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary-400/10 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-purple-400/10 blur-3xl pointer-events-none animate-pulse" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="landing-reveal">
              <div className="inline-flex items-center gap-2 rounded-full landing-glass-card px-4 py-2 mb-6 border border-primary-200/30 dark:border-primary-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{t('landing.tagline')}</span>
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-tight mb-6">
                <span className="text-surface-900 dark:text-white">{t('landing.heroTitle1')}</span>
                <br />
                <span className="landing-gradient-text">{t('landing.heroTitle2')}</span>
                <br />
                <span className="text-surface-900 dark:text-white">{t('landing.heroTitle3')}</span>
              </h1>
              <p className="text-lg text-surface-500 dark:text-surface-400 max-w-xl mb-8 leading-relaxed">
                {t('landing.heroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link to="/login" className="landing-btn-primary inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-base font-bold text-white">
                  <FontAwesomeIcon icon={faRocket} /> {t('common.getStarted')} <FontAwesomeIcon icon={faArrowRight} className="opacity-80" />
                </Link>
                <Link to="/login" className="landing-glass-card group inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-base font-semibold border border-surface-200 dark:border-surface-700 hover:border-primary-300 hover:shadow-lg transition-all">
                  <FontAwesomeIcon icon={faSignInAlt} className="text-primary-500" /> {t('landing.loginDashboard')}
                  <FontAwesomeIcon icon={faChevronRight} className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-surface-500 dark:text-surface-400">
                <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faShieldHalved} className="text-primary-500" /> {t('landing.enterpriseSecure')}</span>
                <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faBolt} className="text-primary-500" /> {t('landing.realtimeUpdates')}</span>
                <span className="inline-flex items-center gap-2"><FontAwesomeIcon icon={faHeadset} className="text-primary-500" /> {t('landing.support247')}</span>
              </div>
            </div>

            <div className="landing-reveal landing-reveal-delay-2 relative hidden sm:block">
              <div className="landing-float relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/30 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-2xl pointer-events-none" />
                <div className="relative landing-glass-card rounded-3xl p-5 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-200/60 dark:border-surface-700/60">
                    <span className="w-3 h-3 rounded-full bg-red-400" /><span className="w-3 h-3 rounded-full bg-amber-400" /><span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <div className="flex-1 ms-2 h-6 rounded-lg bg-surface-100 dark:bg-surface-800 text-[10px] flex items-center px-3 text-surface-400">dashboard.eduadminpro.com</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[['2,847', 'Students', faUsers, '#6366f1'], ['184', 'Teachers', faChalkboardTeacher, '#10b981'], ['64', 'Courses', faBook, '#f59e0b'], ['94%', 'Attendance', faClipboardCheck, '#06b6d4']].map(([v, l, icon, c]) => (
                      <div key={l} className="rounded-xl bg-surface-50 dark:bg-surface-800/80 p-2 border border-surface-200/50 dark:border-surface-700/50">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1" style={{ background: `${c}22` }}>
                          <FontAwesomeIcon icon={icon} className="text-[10px]" style={{ color: c }} />
                        </div>
                        <div className="font-display font-bold text-sm">{v}</div>
                        <div className="text-[9px] text-surface-500">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-surface-50 dark:bg-surface-800/80 p-3 border border-surface-200/50 dark:border-surface-700/50">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-semibold">Attendance Trend</span>
                      <span className="text-emerald-500">+12%</span>
                    </div>
                    <div className="flex items-end gap-0.5 h-16">
                      {[55, 62, 58, 70, 75, 68, 82, 78, 88, 85, 90, 94].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-indigo-600 to-violet-400" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block absolute -top-4 -right-4 landing-glass-card rounded-2xl px-4 py-3 shadow-xl text-sm">
                  <FontAwesomeIcon icon={faChartLine} className="text-emerald-500 me-2" />
                  <span className="font-semibold">Grades +8.4% ↑</span>
                </div>
                <div className="hidden lg:block absolute -bottom-4 -left-4 landing-glass-card rounded-2xl px-4 py-3 shadow-xl text-sm">
                  <FontAwesomeIcon icon={faQrcode} className="text-violet-500 me-2" />
                  <span className="font-semibold">QR Attendance Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 bg-surface-50 dark:bg-surface-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map(({ target, plus, percent, label, icon, color }) => (
            <div key={label} className="landing-reveal landing-glass-card rounded-2xl p-6 text-center hover:border-primary-300 hover:shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${color}18` }}>
                <FontAwesomeIcon icon={icon} className="text-xl" style={{ color }} />
              </div>
              <div className="landing-stat-number font-display font-bold text-3xl mb-1" data-target={target} data-plus={plus ? '1' : '0'} data-percent={percent ? '1' : '0'}>0</div>
              <div className="text-sm text-surface-500 dark:text-surface-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-20 lg:py-28 bg-white dark:bg-surface-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 landing-reveal">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 text-sm font-medium mb-4">
              <FontAwesomeIcon icon={faStar} /> Everything You Need
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4 text-surface-900 dark:text-white">
              Powerful Features for <span className="landing-gradient-text">Modern Schools</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc, color }) => (
              <div key={title} className="landing-tilt landing-feature-card landing-reveal landing-glass-card rounded-2xl p-6 border border-surface-200/70 dark:border-surface-700/50">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}18` }}>
                  <FontAwesomeIcon icon={icon} className="text-lg" style={{ color }} />
                </div>
                <h3 className="font-display font-bold text-base mb-2 text-surface-900 dark:text-white">{title}</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / How it works */}
      <section id="about" className="relative py-20 lg:py-28 bg-surface-50 dark:bg-surface-950 landing-dot-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 landing-reveal">
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-surface-900 dark:text-white">
              Get Started in <span className="landing-gradient-text">4 Easy Steps</span>
            </h2>
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 dark:from-primary-800 dark:via-primary-500 dark:to-primary-800" />
            {STEPS.map(({ num, icon, title, desc, gradient }) => (
              <div key={num} className="landing-reveal flex flex-col items-center text-center relative z-10">
                <div className="relative mb-6">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-xl`}>
                    <FontAwesomeIcon icon={icon} className="text-white text-xl" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-surface-800 border-2 border-primary-400 flex items-center justify-center text-[10px] font-bold text-surface-900 dark:text-white shadow-sm">{num}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-2 text-surface-900 dark:text-white">{title}</h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 max-w-52 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28 bg-white dark:bg-surface-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 landing-reveal">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-surface-900 dark:text-white">What Our <span className="landing-gradient-text">Users Say</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(({ name, role, quote, gradient }) => (
              <div key={name} className="landing-reveal landing-glass-card rounded-3xl p-7 border border-surface-200/70 dark:border-surface-700/50 hover:-translate-y-1 hover:shadow-xl transition-all">
                <div className="flex gap-1 mb-4">{[1, 2, 3, 4, 5].map((i) => <FontAwesomeIcon key={i} icon={faStar} className="text-amber-400 text-sm" />)}</div>
                <blockquote className="relative text-sm text-surface-600 dark:text-surface-400 leading-relaxed mb-6 ps-4">
                  <FontAwesomeIcon icon={faQuoteLeft} className="absolute -top-2 start-0 text-2xl text-primary-100 dark:text-primary-900/50" />
                  {quote}
                </blockquote>
                <div className="flex items-center gap-3 pt-4 border-t border-surface-200/60 dark:border-surface-700/60">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm`}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-surface-900 dark:text-white">{name}</div>
                    <div className="text-xs text-surface-500 dark:text-surface-400">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 lg:py-28 bg-gradient-to-br from-primary-600 via-indigo-700 to-purple-800 overflow-hidden">
        <div className="absolute inset-0 landing-dot-grid opacity-20 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center landing-reveal">
          <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-6 leading-tight">
            Start Managing Your School <span className="text-yellow-300">Smarter</span>
          </h2>
          <p className="text-lg text-white/75 mb-10">Join hundreds of schools using EduAdmin Pro to modernize administration.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="inline-flex items-center justify-center gap-3 bg-white text-primary-600 font-bold rounded-2xl px-8 py-4 hover:bg-primary-50 hover:shadow-2xl hover:-translate-y-1 transition-all">
              <FontAwesomeIcon icon={faRocket} /> Login Now <FontAwesomeIcon icon={faArrowRight} />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/25 text-white rounded-2xl px-8 py-4 hover:bg-white/20 transition-all">
              <FontAwesomeIcon icon={faPlayCircle} /> Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer bg-surface-100 dark:bg-surface-950 pt-16 pb-8 text-surface-600 dark:text-surface-400 border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <BrandLogo className="mb-4" />
              <p className="text-sm leading-relaxed mb-6 text-surface-600 dark:text-surface-400">The complete school management platform for modern educational institutions.</p>
              <div className="flex gap-3">
                {[faTwitter, faFacebook, faLinkedin, faYoutube, faInstagram].map((icon) => (
                  <a key={icon.iconName} href="#" className="landing-footer-social w-9 h-9 rounded-xl flex items-center justify-center hover:-translate-y-0.5 transition-all duration-300">
                    <FontAwesomeIcon icon={icon} className="text-sm" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="landing-footer-heading text-sm font-bold uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#hero" className="hover:text-primary-400 transition-colors">Home</a></li>
                <li><a href="#features" className="hover:text-primary-400 transition-colors">Features</a></li>
                <li><Link to="/login" className="hover:text-primary-400 transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="landing-footer-heading text-sm font-bold uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                {['Student Management', 'Attendance (QR)', 'Exams & Grades', 'Analytics', 'Messaging'].map((l) => (
                  <li key={l}><a href="#features" className="hover:text-primary-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="landing-footer-heading text-sm font-bold uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2"><FontAwesomeIcon icon={faLocationDot} className="text-primary-500 mt-0.5 shrink-0" /> 123 Education Avenue, NY 10001</li>
                <li className="flex items-center gap-2"><FontAwesomeIcon icon={faPhone} className="text-primary-500 shrink-0" /> +1 (234) 567-8900</li>
                <li className="flex items-center gap-2"><FontAwesomeIcon icon={faEnvelope} className="text-primary-500 shrink-0" /> hello@eduadminpro.com</li>
                <li className="flex items-center gap-2"><FontAwesomeIcon icon={faGlobe} className="text-primary-500 shrink-0" /> www.eduadminpro.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-surface-200 dark:border-surface-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p>© {new Date().getFullYear()} EduAdmin Pro. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary-400">Privacy</a>
              <a href="#" className="hover:text-primary-400">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      <button id="landing-scroll-top" type="button" className="fixed bottom-6 end-6 z-50 w-11 h-11 rounded-xl landing-btn-primary flex items-center justify-center text-white opacity-0 pointer-events-none" aria-label="Scroll to top">
        <FontAwesomeIcon icon={faChevronUp} />
      </button>
    </div>
  );
}
