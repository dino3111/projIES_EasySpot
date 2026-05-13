import { Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import type { AppProfile } from '../../context/ProfileContext';

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
  readonly allowedRoles?: readonly AppProfile[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  console.log('[AUTH] ProtectedRoute — isLoading:', isLoading, 'user:', user ? user.sub : 'null', 'path:', globalThis.location.pathname);

  if (isLoading) return null;

  if (!user) {
    console.log('[AUTH] ProtectedRoute — no user, redirecting to /welcome');
    return <Navigate to="/welcome" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'MANAGER')   return <Navigate to="/manager/dashboard"   replace />;
    if (user.role === 'TECHNICAL') return <Navigate to="/technician/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
