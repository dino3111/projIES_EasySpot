import { createContext, useContext, useState, ReactNode } from 'react';

export type AppProfile = 'condutor' | 'gestor';

interface ProfileContextType {
  profile: AppProfile;
  setProfile: (p: AppProfile) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: 'condutor',
  setProfile: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<AppProfile>(() => {
    return (localStorage.getItem('easyspot-profile') as AppProfile) || 'condutor';
  });

  const setProfile = (p: AppProfile) => {
    localStorage.setItem('easyspot-profile', p);
    setProfileState(p);
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
