import { getAccessToken } from './authToken';
import type { Vehicle } from '../context/ProfileContext';
import { API_BASE } from '../../services/apiBase';
import { withGlobalLoading } from '../context/LoadingContext';

type VehicleResponse = {
  id: string;
  plate: string;
  make?: string;
  model?: string;
  version?: string;
  color?: string;
  year?: number;
  fuelType?: string;
  powerKW?: number;
  nickname?: string;
  isEv: boolean;
  isAccessible: boolean;
  isPrimary: boolean;
  imageUrl?: string;
  brandLogoUrl?: string;
};

export async function fetchVehicles(): Promise<Vehicle[]> {
  const token = getAccessToken();
  if (!token) return [];
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/vehicles`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
  if (!resp.ok) return [];
  const data = (await resp.json()) as VehicleResponse[];
  return data.map((v) => ({
    id: v.id,
    plate: v.plate,
    make: v.make,
    model: v.model,
    version: v.version,
    year: v.year ? String(v.year) : undefined,
    color: v.color,
    fuelType: v.fuelType,
    powerKW: v.powerKW,
    nickname: v.nickname,
    isEV: v.isEv,
    isAccessible: v.isAccessible,
    isPrimary: v.isPrimary,
    chargerTypes: v.isEv ? ['Type 2', 'CCS'] : [],
    imageUrl: v.imageUrl,
    brandLogoUrl: v.brandLogoUrl,
  }));
}
