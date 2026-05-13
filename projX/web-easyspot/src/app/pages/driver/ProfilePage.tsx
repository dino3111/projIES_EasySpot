import { useEffect, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { DriverProfile, ManagerProfile, TechnicianProfile } from './components/RoleProfiles';
import { profileApi, type ProfileResponse } from '../../../services/apiService';

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
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    setLoadingProfile(true);
    profileApi.get()
      .then(setProfileData)
      .catch(() => setProfileData(null))
      .finally(() => setLoadingProfile(false));
  }, []);

  if (loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="mb-5">
          <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Perfil</h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>A carregar dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Perfil</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>A sua conta EasySpot</p>
      </div>

      <UserCard accountType={profile} profileData={profileData} onProfileUpdate={setProfileData} />

      {(profileData?.role ?? profile) === 'DRIVER'    && <DriverProfile profileData={profileData?.role === 'DRIVER' ? profileData : null} onProfileUpdate={setProfileData} />}
      {(profileData?.role ?? profile) === 'MANAGER'   && <ManagerProfile profileData={profileData?.role === 'MANAGER' ? profileData : null} />}
      {(profileData?.role ?? profile) === 'TECHNICAL' && <TechnicianProfile profileData={profileData?.role === 'TECHNICAL' ? profileData : null} />}

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

function UserCard({ accountType, profileData, onProfileUpdate }: Readonly<{ accountType: string; profileData: ProfileResponse | null; onProfileUpdate: (profile: ProfileResponse) => void }>) {
  const hasPhoto = Boolean(profileData?.photoUrl);
  return (
    <div className="flex items-center gap-4 rounded-2xl p-5 mb-5 bg-primary shadow-lg shadow-primary/20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
        {hasPhoto ? (
          <img src={profileData?.photoUrl ?? ''} alt="Foto de perfil" className="w-full h-full rounded-full object-cover" />
        ) : (
          <i className="fas fa-user text-white" style={{ fontSize: '1.75rem' }} />
        )}
      </div>
      <div>
        <p className="text-white font-bold" style={{ fontSize: '1.1rem' }}>{profileData?.name ?? 'Utilizador EasySpot'}</p>
        <p className="text-white/80 mt-0.5" style={{ fontSize: '0.8rem' }}>{profileData?.email ?? 'utilizador@easyspot.pt'}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <i className={`fas ${ROLE_ICON[accountType]} text-white/70`} style={{ fontSize: '0.7rem' }} />
          <span className="text-white/70 font-medium" style={{ fontSize: '0.72rem' }}>{ROLE_LABEL[accountType]}</span>
        </div>
        <label className="mt-2 inline-flex items-center gap-1.5 text-white/85 cursor-pointer" style={{ fontSize: '0.74rem' }}>
          <i className="fas fa-camera" />
          Alterar foto
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void profileApi.uploadPhoto(file).then(onProfileUpdate).catch(() => undefined);
            }}
          />
        </label>
      </div>
    </div>
  );
}
