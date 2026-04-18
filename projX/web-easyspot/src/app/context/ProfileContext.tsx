import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppProfile = 'DRIVER' | 'MANAGER' | 'TECHNICIAN';
export type AccountType = AppProfile;
export type DriverType = 'regular' | 'ev' | 'mobilidade_reduzida' | null;

export interface Vehicle {
  id: string;
  plate: string;
  nickname?: string;
  make?: string;
  model?: string;
  version?: string;
  year?: string;
  color?: string;
  fuelType?: string;
  vin?: string;
  powerKW?: number;
  isEV: boolean;
  chargerTypes?: string[];
  isAccessible: boolean;
  isPrimary: boolean;
  rfid?: string;
}

interface ProfileContextType {
  profile: AppProfile;
  setProfile: (p: AppProfile) => void;
  accountType: AccountType;
  setAccountType: (a: AccountType) => void;
  driverType: DriverType;
  setDriverType: (d: DriverType) => void;
  vehicles: Vehicle[];
  addVehicle: (v: Vehicle) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  removeVehicle: (id: string) => void;
  setPrimaryVehicle: (id: string) => void;
  managerParks: string[];
  setManagerParks: (parks: string[]) => void;
  addManagerPark: (parkId: string) => void;
  removeManagerPark: (parkId: string) => void;
}

const STORAGE_KEYS = {
  profile: 'easyspot_profile',
  accountType: 'easyspot_account_type',
  driverType: 'easyspot_driver_type',
  vehicles: 'easyspot_vehicles',
  managerParks: 'easyspot_manager_parks',
} as const;

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

function readJSON<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<AppProfile>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.profile);
    return (stored === 'MANAGER' || stored === 'DRIVER' || stored === 'TECHNICIAN') ? stored : 'DRIVER';
  });

  const [accountType, setAccountTypeState] = useState<AccountType>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.accountType);
    return (stored === 'MANAGER' || stored === 'DRIVER' || stored === 'TECHNICIAN') ? stored : 'DRIVER';
  });

  const [driverType, setDriverTypeState] = useState<DriverType>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.driverType);
    return (stored === 'regular' || stored === 'ev' || stored === 'mobilidade_reduzida') ? stored : null;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => readJSON<Vehicle[]>(STORAGE_KEYS.vehicles, []));

  const [managerParks, setManagerParksState] = useState<string[]>(() => {
    const newKey = readJSON<string[]>(STORAGE_KEYS.managerParks, []);
    if (newKey.length > 0) return newKey;
    return readJSON<string[]>('easyspot-manager-parks', ['coimbra-1', 'coimbra-2']);
  });

  const setProfile = (p: AppProfile) => {
    setProfileState(p);
    setAccountTypeState(p);
    localStorage.setItem(STORAGE_KEYS.profile, p);
    localStorage.setItem(STORAGE_KEYS.accountType, p);
  };

  const setAccountType = (a: AccountType) => {
    setAccountTypeState(a);
    setProfileState(a);
    localStorage.setItem(STORAGE_KEYS.accountType, a);
    localStorage.setItem(STORAGE_KEYS.profile, a);
  };

  const setDriverType = (d: DriverType) => {
    setDriverTypeState(d);
    if (d) {
      localStorage.setItem(STORAGE_KEYS.driverType, d);
    } else {
      localStorage.removeItem(STORAGE_KEYS.driverType);
    }
  };

  const persistVehicles = (next: Vehicle[]) => {
    setVehicles(next);
    localStorage.setItem(STORAGE_KEYS.vehicles, JSON.stringify(next));
  };

  const addVehicle = (vehicle: Vehicle) => {
    const nextVehicle = vehicles.length === 0 ? { ...vehicle, isPrimary: true } : vehicle;
    persistVehicles([...vehicles, nextVehicle]);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    persistVehicles(vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const removeVehicle = (id: string) => {
    const remaining = vehicles.filter((v) => v.id !== id);
    if (remaining.length > 0 && !remaining.some((v) => v.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    persistVehicles(remaining);
  };

  const setPrimaryVehicle = (id: string) => {
    persistVehicles(vehicles.map((v) => ({ ...v, isPrimary: v.id === id })));
  };

  const setManagerParks = (parks: string[]) => {
    setManagerParksState(parks);
    localStorage.setItem(STORAGE_KEYS.managerParks, JSON.stringify(parks));
    localStorage.setItem('easyspot-manager-parks', JSON.stringify(parks));
  };

  const addManagerPark = (parkId: string) => {
    const updated = Array.from(new Set([...managerParks, parkId]));
    setManagerParks(updated);
  };

  const removeManagerPark = (parkId: string) => {
    setManagerParks(managerParks.filter((p) => p !== parkId));
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
        managerParks,
        setManagerParks,
        addManagerPark,
        removeManagerPark,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}