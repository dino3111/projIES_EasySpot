import { Navigate, Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useProfile } from '../../context/ProfileContext';

export function Layout() {
  const { profile } = useProfile();
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith('/manager') && profile !== 'MANAGER') {
    return <Navigate to="/" replace />;
  }

  if (path.startsWith('/technician') && profile !== 'TECHNICAL') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-6" id="main-content">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
