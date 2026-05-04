import { Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import type { AppProfile } from '../../context/ProfileContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppProfile[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Navigate to="/welcome" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'MANAGER')   return <Navigate to="/manager/dashboard"   replace />;
    if (user.role === 'TECHNICAL') return <Navigate to="/technician/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
