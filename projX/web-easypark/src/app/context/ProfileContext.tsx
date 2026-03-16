import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type AppProfile = 'condutor' | 'gestor' | 'tecnico';

interface ProfileContextType {
  profile: AppProfile;
  setProfile: (p: AppProfile) => void;
  managerParks: string[];
  setManagerParks: (parks: string[]) => void;
  addManagerPark: (parkId: string) => void;
  removeManagerPark: (parkId: string) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: 'condutor',
  setProfile: () => {},
  managerParks: [],
  setManagerParks: () => {},
  addManagerPark: () => {},
  removeManagerPark: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<'condutor' | 'gestor'>(() => {
    const stored = localStorage.getItem('easyspot_profile');
    return (stored === 'gestor' || stored === 'condutor') ? stored : 'condutor';
  });

  const [accountType, setAccountType] = useState<AccountType>(() => {
    const stored = localStorage.getItem('easyspot_account_type');
    return (stored === 'gestor' || stored === 'condutor' || stored === 'tecnico') ? stored : 'condutor';
  });

  const [driverType, setDriverType] = useState<DriverType>(() => {
    const stored = localStorage.getItem('easyspot_driver_type');
    return (stored === 'regular' || stored === 'ev' || stored === 'accessible') ? stored : null;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const stored = localStorage.getItem('easyspot_vehicles');
    return stored ? JSON.parse(stored) : [];
  });

  const [managerParks, setManagerParksState] = useState<string[]>(() => {
    const saved = localStorage.getItem('easyspot-manager-parks');
    return saved ? JSON.parse(saved) : ['coimbra-1', 'coimbra-2'];
  });

  const setProfile = (p: AppProfile) => {
    localStorage.setItem('easyspot-profile', p);
    setProfileState(p);
  };

  const setManagerParks = (parks: string[]) => {
    localStorage.setItem('easyspot-manager-parks', JSON.stringify(parks));
    setManagerParksState(parks);
  };

  const addManagerPark = (parkId: string) => {
    const updated = Array.from(new Set([...managerParks, parkId]));
    setManagerParks(updated);
  };

  const removeManagerPark = (parkId: string) => {
    const updated = managerParks.filter(p => p !== parkId);
    setManagerParks(updated);
  };

  return (
    <ProfileContext.Provider value={{ 
      profile, 
      setProfile, 
      managerParks, 
      setManagerParks, 
      addManagerPark, 
      removeManagerPark 
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}