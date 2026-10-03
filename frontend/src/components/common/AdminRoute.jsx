import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store';

export default function AdminRoute() {
  const { hasRole } = useAuthStore();
  if (!hasRole('super_admin', 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
