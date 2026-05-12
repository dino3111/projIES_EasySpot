import { Navigate, Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useProfile } from '../../context/ProfileContext';
import { useDriverOnboarding } from '../../hooks/useDriverOnboarding';
import { OnboardingModal } from '../../pages/driver/welcome/OnboardingModal';

export function Layout() {
  const { profile, setDriverType } = useProfile();
  const location = useLocation();
  const path = location.pathname;
  const { showOnboarding, setShowOnboarding, needsVehicle, needsPayment } = useDriverOnboarding();

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
