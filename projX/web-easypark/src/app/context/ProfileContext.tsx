import { createContext, useContext, useState, ReactNode } from 'react';

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
  const [profile, setProfileState] = useState<AppProfile>(() => {
    return (localStorage.getItem('easyspot-profile') as AppProfile) || 'condutor';
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
  return useContext(ProfileContext);
}
