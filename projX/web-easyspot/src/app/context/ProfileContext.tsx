import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchVehicles } from '../services/vehiclesApi';
import { useAuth } from './AuthContext';

export type AppProfile = 'DRIVER' | 'MANAGER' | 'TECHNICAL';
export type DriverType = 'regular' | 'ev' | 'reduced_mobility' | null;

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
  imageUrl?: string;
  brandLogoUrl?: string;
}

interface ProfileContextType {
  profile: AppProfile;
  setProfile: (p: AppProfile) => void;
  accountType: AppProfile;
  setAccountType: (a: AppProfile) => void;
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

export function ProfileProvider({ children }: { readonly children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AppProfile>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.profile);
    return stored === 'MANAGER' || stored === 'DRIVER' || stored === 'TECHNICAL' ? stored : 'DRIVER';
  });

  const [accountType, setAccountType] = useState<AppProfile>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.accountType);
    return stored === 'MANAGER' || stored === 'DRIVER' || stored === 'TECHNICAL' ? stored : 'DRIVER';
  });

  const [driverType, setDriverType] = useState<DriverType>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.driverType);
    if (stored === 'regular' || stored === 'ev' || stored === 'reduced_mobility') return stored;
    if (stored === 'mobilidade_reduzida') return 'reduced_mobility';
    return null;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    readJSON<Vehicle[]>(STORAGE_KEYS.vehicles, [])
  );

  function mergeVehicles(base: Vehicle[], fetched: Vehicle[]) {
    if (base.length === 0) return fetched;
    const byId = new Map(base.map((vehicle) => [vehicle.id, vehicle]));
    return fetched.map((vehicle) => {
      const stored = byId.get(vehicle.id);
      if (!stored) return vehicle;
      return {
        ...vehicle,
        ...stored,
        chargerTypes: stored.chargerTypes ?? vehicle.chargerTypes,
      };
    });
  }

  useEffect(() => {
    if (authLoading) return;

    if (user?.role !== 'DRIVER') {
      return;
    }

    let mounted = true;
    fetchVehicles().then((list) => {
      if (!mounted || list.length === 0) return;
      const nextVehicles = mergeVehicles(readJSON<Vehicle[]>(STORAGE_KEYS.vehicles, []), list);
      setVehicles(nextVehicles);
      localStorage.setItem(STORAGE_KEYS.vehicles, JSON.stringify(nextVehicles));
    }).catch(() => {
      // Keep local fallback when backend/auth is unavailable.
    });
    return () => {
      mounted = false;
    };
  }, [authLoading, user?.role]);

  const [managerParks, setManagerParks] = useState<string[]>(() => {
    const stored = readJSON<string[]>(STORAGE_KEYS.managerParks, []);
    if (stored.length > 0) return stored;
    return readJSON<string[]>('easyspot-manager-parks', ['coimbra-1', 'coimbra-2']);
  });

  const handleProfileChange = (p: AppProfile) => {
    setProfile(p);
    setAccountType(p);
    localStorage.setItem(STORAGE_KEYS.profile, p);
    localStorage.setItem(STORAGE_KEYS.accountType, p);
  };

  const handleAccountTypeChange = (a: AppProfile) => {
    setAccountType(a);
    setProfile(a);
    localStorage.setItem(STORAGE_KEYS.accountType, a);
    localStorage.setItem(STORAGE_KEYS.profile, a);
  };

  const handleDriverTypeChange = (d: DriverType) => {
    setDriverType(d);
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
    const next = vehicles.length === 0 ? { ...vehicle, isPrimary: true } : vehicle;
    persistVehicles([...vehicles, next]);
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

  const handleManagerParksChange = (parks: string[]) => {
    setManagerParks(parks);
    localStorage.setItem(STORAGE_KEYS.managerParks, JSON.stringify(parks));
    localStorage.setItem('easyspot-manager-parks', JSON.stringify(parks));
  };

  const addManagerPark = (parkId: string) => {
    handleManagerParksChange(Array.from(new Set([...managerParks, parkId])));
  };

  const removeManagerPark = (parkId: string) => {
    handleManagerParksChange(managerParks.filter((p) => p !== parkId));
  };

  const contextValue = useMemo(() => ({
    profile,
    setProfile: handleProfileChange,
    accountType,
    setAccountType: handleAccountTypeChange,
    driverType,
    setDriverType: handleDriverTypeChange,
    vehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,
    setPrimaryVehicle,
    managerParks,
    setManagerParks: handleManagerParksChange,
    addManagerPark,
    removeManagerPark,
  }), [profile, accountType, driverType, vehicles, managerParks]);

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
}
