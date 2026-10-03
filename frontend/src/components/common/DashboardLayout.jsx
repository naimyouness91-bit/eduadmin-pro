import { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faChevronDown,
  faShieldAlt,
  faBars,
} from '@fortawesome/free-solid-svg-icons';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import FloatingMenu from './FloatingMenu';
import PremiumSidebar from '../sidebar/PremiumSidebar';
import ErrorBoundary from './ErrorBoundary';
import PageTransition from '../../motion/PageTransition';
import { NAV_ITEMS } from '../../config/navigation';
import { useAuthStore, useUIStore } from '../../store';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const {
    sidebarExpanded,
    mobileSidebarOpen,
    toggleSidebar,
    toggleSidebarExpand,
    closeMobileSidebar,
  } = useUIStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuTriggerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const filteredNav = useMemo(() => {
    return NAV_ITEMS.filter((item) => item.roles.includes(user?.role)).map((item) => ({
      ...item,
      label: t(item.labelKey),
    }));
  }, [user?.role, t]);

  const roleLabel = user?.role ? t(`roles.${user.role}`, { defaultValue: user.role.replace('_', ' ') }) : '';

  const handleLogout = async () => {
    await logout();
    toast.success(t('common.logoutSuccess'));
    navigate('/login');
  };

  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) closeMobileSidebar();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [closeMobileSidebar]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMobileSidebar();
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeMobileSidebar]);

  useEffect(() => {
    if (mobileSidebarOpen && window.innerWidth < 768) {
      document.body.classList.add('sidebar-mobile-open');
    } else {
      document.body.classList.remove('sidebar-mobile-open');
    }
    return () => document.body.classList.remove('sidebar-mobile-open');
  }, [mobileSidebarOpen]);

  return (
    <div className="app-shell flex h-[100dvh] min-h-0 bg-surface-50 dark:bg-surface-950 font-sans transition-colors duration-300">
      <PremiumSidebar
        navItems={filteredNav}
        user={user}
        expanded={sidebarExpanded}
        mobileOpen={mobileSidebarOpen}
        onToggleExpand={toggleSidebarExpand}
        onCloseMobile={closeMobileSidebar}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="relative z-50 flex-shrink-0 overflow-visible bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200/80 dark:border-surface-700/50 px-4 lg:px-6 py-3 md:py-0 md:h-[4.5rem] flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors duration-300">
          <div className="flex items-center gap-3 w-full md:w-auto min-w-0">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2.5 rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-primary-500 dark:hover:text-primary-400 transition-all duration-200 active:scale-95 md:hidden"
              aria-label={mobileSidebarOpen ? t('common.closeMenu') : t('common.openMenu')}
              aria-expanded={mobileSidebarOpen}
            >
              <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
            </button>

            <GlobalSearch className="flex-1 min-w-0 md:flex-none md:w-64 xl:w-80" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <LanguageSwitcher compact />

            <ThemeToggle />

            <NotificationBell />

            <div ref={userMenuTriggerRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <img src={user?.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-primary-500/20" />
                <div className="hidden lg:block text-start">
                  <p className="text-sm font-medium text-surface-900 dark:text-white leading-tight">{user?.name}</p>
                  <p className="text-xs text-surface-500 capitalize">{roleLabel}</p>
                </div>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`header-chevron text-surface-400 w-3 h-3 hidden lg:block transition-transform duration-200 ${userMenuOpen ? 'is-open' : ''}`}
                />
              </button>

              <FloatingMenu
                open={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
                triggerRef={userMenuTriggerRef}
                preferAbove
              >
                <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                  {t('common.account')}
                </p>
                {[
                  { icon: faUser, label: t('common.profile'), path: '/profile' },
                  ...(isAdmin ? [{ icon: faShieldAlt, label: t('common.settings'), path: '/settings' }] : []),
                ].map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate(item.path);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-primary-500/10 dark:hover:bg-primary-500/10 transition-colors duration-150"
                  >
                    <span className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 group-hover:shadow-sm">
                      <FontAwesomeIcon icon={item.icon} className="w-3.5 h-3.5 text-surface-500" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </FloatingMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6 page-content-safe min-w-0 bg-gradient-to-br from-surface-50 via-surface-50 to-primary-50/20 dark:from-surface-950 dark:via-surface-950 dark:to-primary-950/10 transition-colors duration-300 overflow-y-auto overscroll-y-contain">
          <ErrorBoundary>
            <PageTransition routeKey={`${location.pathname}${location.search}`}>
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
