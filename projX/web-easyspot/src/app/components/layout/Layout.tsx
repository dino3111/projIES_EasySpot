import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useProfile } from '../../context/ProfileContext';
import { useDriverOnboarding } from '../../hooks/useDriverOnboarding';
import { OnboardingModal } from '../../pages/driver/welcome/OnboardingModal';

const SIDEBAR_STORAGE_KEY = 'easyspot-sidebar-collapsed';

export function Layout() {
  const { profile, setDriverType } = useProfile();
  const location = useLocation();
  const path = location.pathname;
  const { showOnboarding, setShowOnboarding, needsVehicle, needsPayment } = useDriverOnboarding();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedValue === 'true') setIsSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  if (path.startsWith('/manager') && profile !== 'MANAGER') {
    return <Navigate to="/" replace />;
  }

  if (path.startsWith('/technician') && profile !== 'TECHNICAL') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col transition-colors duration-300">
      <Header
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
        />

        <main className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-6" id="main-content">
          <Outlet key={location.pathname} />
        </main>
      </div>

      <BottomNav />

      {showOnboarding && (
        <OnboardingModal
          needsVehicle={needsVehicle}
          needsPayment={needsPayment}
          onFinish={(dt) => { setDriverType(dt); setShowOnboarding(false); }}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
