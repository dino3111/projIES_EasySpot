import { useProfile } from '../../context/ProfileContext';
import { DriverProfile, ManagerProfile, TechnicianProfile } from './components/RoleProfiles';

const ROLE_LABEL: Record<string, string> = {
  DRIVER: 'Condutor',
  MANAGER: 'Gestor de Parques',
  TECHNICAL: 'Técnico de Manutenção',
};

const ROLE_ICON: Record<string, string> = {
  DRIVER: 'fa-car',
  MANAGER: 'fa-chart-pie',
  TECHNICAL: 'fa-wrench',
};

export function ProfilePage() {
  const { profile } = useProfile();

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Perfil</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>A sua conta EasySpot</p>
      </div>

      <UserCard accountType={profile} />

      {profile === 'DRIVER'    && <DriverProfile />}
      {profile === 'MANAGER'   && <ManagerProfile />}
      {profile === 'TECHNICAL' && <TechnicianProfile />}

      <div className="text-center pb-4 mt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <i className="fas fa-square-parking text-primary text-base" aria-hidden="true" />
          <span className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>EasySpot</span>
        </div>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Versão 1.0.0 · © 2026 EasySpot</p>
      </div>
    </div>
  );
}

function UserCard({ accountType }: Readonly<{ accountType: string }>) {
  return (
    <div className="flex items-center gap-4 rounded-2xl p-5 mb-5 bg-primary shadow-lg shadow-primary/20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
        <i className="fas fa-user text-white" style={{ fontSize: '1.75rem' }} />
      </div>
      <div>
        <p className="text-white font-bold" style={{ fontSize: '1.1rem' }}>Utilizador EasySpot</p>
        <p className="text-white/80 mt-0.5" style={{ fontSize: '0.8rem' }}>utilizador@easyspot.pt</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <i className={`fas ${ROLE_ICON[accountType]} text-white/70`} style={{ fontSize: '0.7rem' }} />
          <span className="text-white/70 font-medium" style={{ fontSize: '0.72rem' }}>{ROLE_LABEL[accountType]}</span>
        </div>
      </div>
    </div>
  );
}
