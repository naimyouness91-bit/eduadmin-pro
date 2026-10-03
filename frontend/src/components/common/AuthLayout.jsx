import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { useAuthHydrated } from '../../hooks/useAuthHydrated';
import { getDashboardPath } from '../../utils/authSession';

export default function AuthLayout() {
  const hydrated = useAuthHydrated();
  const { isAuthenticated, user, token } = useAuthStore();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
        <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && token && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}
