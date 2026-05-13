import type { AccessibleSpot, EVCharger, ParkingFloor, ParkingLot, ParkingSpot, ParkingZone } from '../data/parkingTypes';

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatWalkingTime(km: number): string {
  const minutes = Math.round((km / 5) * 60);
  return minutes < 1 ? '< 1 min' : `${minutes} min`;
}
import { getAccessToken } from './authToken';
import { API_BASE } from '../../services/apiBase';
import { withGlobalLoading } from '../context/LoadingContext';

type ParkListResponse = {
  items: Array<{
    id: string;
    name: string;
    city: string;
    address: string;
    latitude: number;
    longitude: number;
    openingHours: string;
    pricePerHour: number | null;
    totalSpaces: number;
    freeSpaces: number;
    evChargers: { available: number; total: number };
    accessibleSpaces: { available: number; total: number };
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type ParkDetailsResponse = {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  openingHours: string;
  totalSpaces: number;
  freeSpaces: number;
  zones: Array<{ zoneName: string; total: number; free: number }>;
  spotMap: Array<{ spotId: string; spotNumber: string; zone: string; row: number; col: number; status: ParkingSpot['status'] }>;
  evChargers: Array<{ type: EVCharger['type']; speed: EVCharger['speed']; speedKw: number; pricePerKwh: number; availability: boolean }>;
  accessibility: Array<{ location: string; availability: boolean; distanceToEntranceMeters: number; baySize: string; monitored: boolean; hasRampSpace: boolean; sensorStatus: string; ledStatus: string }>;
  tariffs?: Array<{ pricePerHour: number; maxDaily: number; monthly: number }>;
  amenities?: string[];
};

type FavoriteToggleResponse = {
  parkId: string;
  isFavorite: boolean;
};

type AlertSubscriptionResponse = {
  subscription: {
    id: string;
    enabled: boolean;
    createdAt: string;
  };
};

function is24Hours(openingHours: string): boolean {
  const normalized = openingHours.toLowerCase();
  return normalized.includes('24h') || normalized.includes('24 h');
}

function toLocalidade(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? (parts.at(-1) ?? 'N/D') : (parts.at(0) ?? 'N/D');
}

function normalizeAvailabilityCounts(totalSpots: number, availableSpots: number) {
  const safeTotal = Math.max(0, Number.isFinite(totalSpots) ? totalSpots : 0);
  const safeAvailable = Math.min(safeTotal, Math.max(0, Number.isFinite(availableSpots) ? availableSpots : 0));
  return { totalSpots: safeTotal, availableSpots: safeAvailable };
}

function normalizeZone(zone: string): ParkingZone['type'] {
  if (zone === 'EV') return 'ev';
  if (zone === 'ACCESSIBLE') return 'accessible';
  if (zone === 'RESERVED') return 'reserved';
  return 'standard';
}

function mapSpotLabel(spotNumber: string): string {
  const idx = spotNumber.indexOf(':');
  return idx >= 0 ? spotNumber.slice(idx + 1) : spotNumber;
}

function formatFloorName(floorId: string): string {
  const match = /p(\d+)$/i.exec(floorId);
  if (match) return `Piso ${match[1]}`;
  return floorId;
}

function resolveSpotStatus(apiStatus: ParkingSpot['status'], zone: string): ParkingSpot['status'] {
  if (apiStatus === 'occupied' || apiStatus === 'reserved') return apiStatus;
  const z = (zone ?? '').toUpperCase().trim();
  if (z === 'EV' || z.includes('ELECTRIC') || z.includes('CHARG')) return 'ev';
  if (
    z === 'ACCESSIBLE' ||
    z.includes('ACCESS') ||
    z.includes('PMR') ||
    z.includes('MOBIL') ||
    z.includes('DISAB')
  ) return 'accessible';
  return apiStatus;
}

function mapFloors(spots: ParkDetailsResponse['spotMap']): ParkingFloor[] {
  const grouped = new Map<string, ParkingSpot[]>();
  for (const spot of spots) {
    const floorId = spot.spotNumber.includes(':') ? spot.spotNumber.split(':')[0] : 'floor-default';
    const mapped: ParkingSpot = {
      id: spot.spotId ?? spot.spotNumber,
      row: Math.max(0, spot.row - 1),
      col: Math.max(0, spot.col - 1),
      status: resolveSpotStatus(spot.status, spot.zone),
      label: mapSpotLabel(spot.spotNumber),
    };
    const prev = grouped.get(floorId) ?? [];
    prev.push(mapped);
    grouped.set(floorId, prev);
  }

  return Array.from(grouped.entries()).map(([id, floorSpots]) => {
    const maxRow = floorSpots.reduce((max, s) => Math.max(max, s.row), 0);
    const maxCol = floorSpots.reduce((max, s) => Math.max(max, s.col), 0);
    return {
      id,
      name: formatFloorName(id),
      rows: maxRow + 1,
      cols: maxCol + 1,
      spots: floorSpots,
    };
  });
}

function buildPlaceholderEvChargers(total: number, available: number): EVCharger[] {
  return Array.from({ length: total }).map((_, idx) => ({
    id: `ev-${idx + 1}`,
    type: 'Type 2',
    speed: 'Rápida (22kW)',
    speedKW: 22,
    available: idx < available,
    price: 0,
  }));
}

function buildPlaceholderAccessible(total: number, available: number): AccessibleSpot[] {
  return Array.from({ length: total }).map((_, idx) => ({
    id: `acc-${idx + 1}`,
    zone: `Zona ${idx + 1}`,
    available: idx < available,
    monitored: false,
    distanceToEntrance: 0,
    hasRampSpace: false,
    dimensions: '3.5m x 5.0m',
    sensorStatus: 'online',
    ledStatus: idx < available ? 'green' : 'red',
  }));
}

export type FetchParksQuery = {
  textQuery?: string;
  city?: string;
  page?: number;
  pageSize?: number;
  vehicleId?: string | null;
  evOnly?: boolean;
  accessibleOnly?: boolean;
  availableOnly?: boolean;
};

export type PagedParks = {
  items: ParkingLot[];
  pagination: ParkListResponse['pagination'];
};

export async function fetchParksList(query: FetchParksQuery = {}): Promise<PagedParks> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
  });
  if (query.textQuery) params.set('textQuery', query.textQuery);
  if (query.city) params.set('city', query.city);
  if (query.availableOnly) params.set('minAvailableSpaces', '1');
  if (query.vehicleId) params.set('vehicleId', query.vehicleId);
  const filters: string[] = [];
  if (query.evOnly) filters.push('EV');
  if (query.accessibleOnly) filters.push('ACCESSIBLE');
  for (const f of filters) params.append('filters', f);
  const token = getAccessToken();
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/parks/list?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));
  if (!resp.ok) throw new Error(`Failed to fetch parks list (${resp.status})`);
  const data = (await resp.json()) as ParkListResponse;

  return {
    items: data.items.map((item) => ({
    ...normalizeAvailabilityCounts(item.totalSpaces, item.freeSpaces),
    id: item.id,
    name: item.name,
    address: item.address,
    localidade: item.city || toLocalidade(item.address),
    hourlyRate: item.pricePerHour ?? 0,
    dailyMax: 0,
    monthlyRate: 0,
    distance: 'N/D',
    walkingTime: 'N/D',
    hasEVCharger: item.evChargers.total > 0,
    hasAccessible: item.accessibleSpaces.total > 0,
    latitude: item.latitude,
    longitude: item.longitude,
    evChargers: buildPlaceholderEvChargers(item.evChargers.total, item.evChargers.available),
    accessibleSpots: buildPlaceholderAccessible(item.accessibleSpaces.total, item.accessibleSpaces.available),
    rating: 0,
    reviewCount: 0,
    openingHours: item.openingHours ?? '',
    is24h: is24Hours(item.openingHours ?? ''),
    amenities: [],
    zones: [],
    floors: [],
    phone: 'N/D',
    techFeatures: { hasOCR: false, hasEntrySensor: false, hasIRSensors: false, hasLEDs: false },
    })),
    pagination: data.pagination,
  };
}

export async function fetchParkCities(): Promise<string[]> {
  const token = getAccessToken();
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/parks/cities`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));
  if (!resp.ok) return [];
  return (await resp.json()) as string[];
}

export async function fetchParkDetails(parkId: string): Promise<ParkingLot> {
  const token = getAccessToken();
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/parks/${parkId}/details`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));
  if (!resp.ok) throw new Error(`Failed to fetch park details (${resp.status})`);
  const data = (await resp.json()) as ParkDetailsResponse;
  const lotCounts = normalizeAvailabilityCounts(data.totalSpaces, data.freeSpaces);

  const primaryTariff = data.tariffs?.[0];
  const availableCharger = data.evChargers.find((c) => c.availability) ?? data.evChargers[0];
  const evChargers: EVCharger[] = data.evChargers.map((c, idx) => ({
    id: `${data.id}-ev-${idx + 1}`,
    type: c.type,
    speed: c.speed,
    speedKW: c.speedKw || Number.parseInt(c.speed.replaceAll(/\D/g, ''), 10) || 0,
    available: c.availability,
    price: c.pricePerKwh ?? 0,
  }));
  const accessibleSpots: AccessibleSpot[] = data.accessibility.map((a, idx) => ({
    id: `${data.id}-acc-${idx + 1}`,
    zone: a.location,
    available: a.availability,
    monitored: a.monitored ?? false,
    distanceToEntrance: a.distanceToEntranceMeters,
    hasRampSpace: a.hasRampSpace ?? false,
    dimensions: a.baySize,
    sensorStatus: a.sensorStatus === 'faulty' ? 'faulty' : 'online',
    ledStatus: (a.ledStatus ?? (a.availability ? 'green' : 'red')) as 'green' | 'red' | 'blue' | 'yellow',
  }));
  const zones: ParkingZone[] = data.zones.map((z, idx) => ({
    ...normalizeAvailabilityCounts(z.total, z.free),
    id: `${data.id}-zone-${idx + 1}`,
    name: z.zoneName,
    type: normalizeZone(z.zoneName),
    floor: 'N/D',
  }));

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    localidade: toLocalidade(data.address),
    availableSpots: lotCounts.availableSpots,
    totalSpots: lotCounts.totalSpots,
    hourlyRate: primaryTariff?.pricePerHour ?? 0,
    dailyMax: primaryTariff?.maxDaily ?? 0,
    monthlyRate: primaryTariff?.monthly ?? 0,
    evChargingRate: availableCharger?.pricePerKwh ?? 0,
    distance: 'N/D',
    walkingTime: 'N/D',
    hasEVCharger: evChargers.length > 0,
    hasAccessible: accessibleSpots.length > 0,
    latitude: data.coordinates.lat,
    longitude: data.coordinates.lng,
    evChargers,
    accessibleSpots,
    rating: 0,
    reviewCount: 0,
    openingHours: data.openingHours ?? '',
    is24h: is24Hours(data.openingHours ?? ''),
    amenities: data.amenities ?? [],
    zones,
    floors: mapFloors(data.spotMap ?? []),
    phone: 'N/D',
    techFeatures: { hasOCR: false, hasEntrySensor: false, hasIRSensors: false, hasLEDs: false },
  };
}

export async function toggleParkFavorite(parkId: string): Promise<FavoriteToggleResponse> {
  const token = getAccessToken();
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/parks/${parkId}/favorite`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));
  if (!resp.ok) throw new Error(`Failed to toggle favorite (${resp.status})`);
  return (await resp.json()) as FavoriteToggleResponse;
}

export async function fetchParkFavoriteStatus(parkId: string): Promise<FavoriteToggleResponse> {
  const token = getAccessToken();
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/parks/${parkId}/favorite`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));
  if (!resp.ok) throw new Error(`Failed to fetch favorite status (${resp.status})`);
  return (await resp.json()) as FavoriteToggleResponse;
}

export async function fetchFavoriteParks(): Promise<ParkingLot[]> {
  const firstPage = await fetchParksList({ page: 1, pageSize: 200 });
  if (firstPage.items.length === 0) return [];

  const checks = await Promise.all(
    firstPage.items.map(async (park) => {
      try {
        const status = await fetchParkFavoriteStatus(park.id);
        return status.isFavorite ? park : null;
      } catch {
        return null;
      }
    }),
  );

  return checks.filter((park): park is ParkingLot => park !== null);
}

export async function fetchParkHourlyOccupancy(parkId: string): Promise<Array<{ hour: string; occupancyPercent: number }>> {
  const token = getAccessToken();
  const resp = await fetch(`${API_BASE}/api/parks/${parkId}/occupancy/hourly`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!resp.ok) return [];
  return (await resp.json()) as Array<{ hour: string; occupancyPercent: number }>;
}

export async function subscribeSpaceAvailableAlerts(parkIds: string[]): Promise<AlertSubscriptionResponse> {
  const token = getAccessToken();
  const uniqueParkIds = [...new Set(parkIds.filter(Boolean))];
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/alerts/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      alertType: 'SPACE_AVAILABLE',
      parkIds: uniqueParkIds,
    }),
  }));
  if (!resp.ok) {
    // Subscription uniqueness is enforced server-side. A 409 means "already subscribed",
    // which is a successful outcome from the user's perspective.
    if (resp.status === 409) {
      return {
        subscription: {
          id: 'existing',
          enabled: true,
          createdAt: new Date().toISOString(),
        },
      };
    }
    let detail = '';
    try {
      detail = await resp.text();
    } catch {
      detail = '';
    }
    throw new Error(detail ? `Failed to subscribe alerts (${resp.status}): ${detail}` : `Failed to subscribe alerts (${resp.status})`);
  }
  return (await resp.json()) as AlertSubscriptionResponse;
}
