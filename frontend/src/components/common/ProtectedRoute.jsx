import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { useAuthHydrated } from '../../hooks/useAuthHydrated';

function AuthLoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-surface-950">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-primary-900" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 animate-spin" />
      </div>
      <p className="text-sm text-surface-400">{message}</p>
    </div>
  );
}

export default function ProtectedRoute() {
  const hydrated = useAuthHydrated();
  const { isAuthenticated, token, user } = useAuthStore();

  if (!hydrated) {
    return <AuthLoadingScreen message="Restoring session…" />;
  }

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
