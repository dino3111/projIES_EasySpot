import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type DriverType = 'regular' | 'ev' | 'accessible' | null;
export type AccountType = 'condutor' | 'gestor' | 'tecnico';

export interface Vehicle {
  id: string;
  plate: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  nickname?: string;
  isEV?: boolean;
  chargerTypes?: string[];
  isAccessible?: boolean;
  isPrimary?: boolean;
}

interface ProfileContextValue {
  profile: 'condutor' | 'gestor';
  setProfile: (profile: 'condutor' | 'gestor') => void;
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  driverType: DriverType;
  setDriverType: (type: DriverType) => void;
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  setPrimaryVehicle: (id: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

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

  useEffect(() => {
    localStorage.setItem('easyspot_profile', profile);
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('easyspot_account_type', accountType);
    // Sync profile with accountType for backwards compatibility
    if (accountType === 'gestor' || accountType === 'condutor') {
      setProfile(accountType);
    }
  }, [accountType]);

  useEffect(() => {
    if (driverType) {
      localStorage.setItem('easyspot_driver_type', driverType);
    } else {
      localStorage.removeItem('easyspot_driver_type');
    }
  }, [driverType]);

  useEffect(() => {
    localStorage.setItem('easyspot_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  const addVehicle = (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: `vehicle-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      isPrimary: vehicles.length === 0, // First vehicle is primary by default
    };
    setVehicles((prev) => [...prev, newVehicle]);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const removeVehicle = (id: string) => {
    setVehicles((prev) => {
      const filtered = prev.filter((v) => v.id !== id);
      // If we removed the primary vehicle and there are others, make the first one primary
      const hadPrimary = prev.find((v) => v.id === id)?.isPrimary;
      if (hadPrimary && filtered.length > 0 && !filtered.some((v) => v.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const setPrimaryVehicle = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) => ({ ...v, isPrimary: v.id === id }))
    );
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        accountType,
        setAccountType,
        driverType,
        setDriverType,
        vehicles,
        addVehicle,
        updateVehicle,
        removeVehicle,
        setPrimaryVehicle,
      }}
    >
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