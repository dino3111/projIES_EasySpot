import type { AccessibleSpot, EVCharger, ParkingFloor, ParkingLot, ParkingSpot, ParkingZone } from '../data/parkingTypes';
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
  evChargers: Array<{ type: EVCharger['type']; speed: EVCharger['speed']; pricePerKwh: number; availability: boolean }>;
  accessibility: Array<{ location: string; availability: boolean; distanceToEntranceMeters: number; baySize: string }>;
  tariffs: Array<{ pricePerHour: number | null; maxDaily: number | null; monthly: number | null }>;
  amenities: string[];
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

let cachedCoords: { lat: number; lng: number } | null = null;

function is24Hours(openingHours: string): boolean {
  const normalized = openingHours.toLowerCase();
  return normalized.includes('24h') || normalized.includes('24 h');
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeAvailability(available: number, total: number): { available: number; total: number } {
  const safeTotal = clampNonNegative(total);
  const safeAvailable = Math.min(clampNonNegative(available), safeTotal);
  return { available: safeAvailable, total: safeTotal };
}

function toLocalidade(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? (parts.at(-1) ?? 'N/D') : (parts.at(0) ?? 'N/D');
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

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatWalkingTime(distanceMeters: number): string {
  const walkingSpeedMetersPerMinute = 80;
  const minutes = Math.max(1, Math.round(distanceMeters / walkingSpeedMetersPerMinute));
  return `${minutes} min`;
}

function estimateDrivingMeters(straightLineMeters: number): number {
  return straightLineMeters * 1.35;
}

function formatDrivingTime(distanceMeters: number): string {
  const urbanDrivingMetersPerMinute = 500;
  const minutes = Math.max(1, Math.round(distanceMeters / urbanDrivingMetersPerMinute));
  return `${minutes} min`;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const earthRadius = 6371000;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function getUserCoords(): Promise<{ lat: number; lng: number } | null> {
  if (cachedCoords) return cachedCoords;
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(cachedCoords);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 },
    );
  });
}

function mapFloors(spots: ParkDetailsResponse['spotMap']): ParkingFloor[] {
  const grouped = new Map<string, ParkingSpot[]>();
  for (const spot of spots) {
    const floorId = spot.spotNumber.includes(':') ? spot.spotNumber.split(':')[0] : 'floor-default';
    const mapped: ParkingSpot = {
      id: spot.spotId ?? spot.spotNumber,
      row: Math.max(0, spot.row - 1),
      col: Math.max(0, spot.col - 1),
      status: spot.status,
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
      name: id,
      rows: maxRow + 1,
      cols: maxCol + 1,
      spots: floorSpots,
    };
  });
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
  const coords = await getUserCoords();

  return {
    items: data.items.map((item) => {
      const normalizedLot = normalizeAvailability(item.freeSpaces, item.totalSpaces);
      const normalizedEv = normalizeAvailability(item.evChargers.available, item.evChargers.total);
      const normalizedAccessible = normalizeAvailability(item.accessibleSpaces.available, item.accessibleSpaces.total);
      const lotCoords = { lat: item.latitude, lng: item.longitude };
      const distanceMeters = coords ? haversineMeters(coords, lotCoords) : null;
      const drivingMeters = distanceMeters !== null ? estimateDrivingMeters(distanceMeters) : null;

      return {
        id: item.id,
        name: item.name,
        address: item.address,
        localidade: item.city || toLocalidade(item.address),
        availableSpots: normalizedLot.available,
        totalSpots: normalizedLot.total,
        hourlyRate: item.pricePerHour ?? 0,
        dailyMax: 0,
        monthlyRate: 0,
        distance: distanceMeters !== null ? formatDistance(distanceMeters) : 'N/D',
        walkingTime: distanceMeters !== null ? formatWalkingTime(distanceMeters) : 'N/D',
        drivingDistance: drivingMeters !== null ? formatDistance(drivingMeters) : 'N/D',
        drivingTime: drivingMeters !== null ? formatDrivingTime(drivingMeters) : 'N/D',
        hasEVCharger: normalizedEv.total > 0,
        hasAccessible: normalizedAccessible.total > 0,
        latitude: item.latitude,
        longitude: item.longitude,
        evChargers: [],
        accessibleSpots: [],
        rating: 0,
        reviewCount: 0,
        openingHours: item.openingHours ?? '',
        is24h: is24Hours(item.openingHours ?? ''),
        amenities: [],
        zones: [],
        floors: [],
        phone: 'N/D',
        techFeatures: { hasOCR: false, hasOcrIdentification: false, hasIRSensors: false, hasLEDs: false },
      };
    }),
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
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }));
  if (!resp.ok) throw new Error(`Failed to fetch park details (${resp.status})`);
  const data = (await resp.json()) as ParkDetailsResponse;

  const primaryTariff = data.tariffs[0];
  const evChargers: EVCharger[] = data.evChargers.map((c, idx) => ({
    id: `${data.id}-ev-${idx + 1}`,
    type: c.type,
    speed: c.speed,
    speedKW: Number.parseInt(c.speed.replaceAll(/\D/g, ''), 10) || 0,
    available: c.availability,
    price: c.pricePerKwh ?? 0,
  }));
  const accessibleSpots: AccessibleSpot[] = data.accessibility.map((a, idx) => ({
    id: `${data.id}-acc-${idx + 1}`,
    zone: a.location,
    available: a.availability,
    monitored: false,
    distanceToEntrance: a.distanceToEntranceMeters,
    hasRampSpace: false,
    dimensions: a.baySize,
    sensorStatus: 'online',
    ledStatus: a.availability ? 'green' : 'red',
  }));
  const zones: ParkingZone[] = data.zones.map((z, idx) => {
    const normalized = normalizeAvailability(z.free, z.total);
    return {
      id: `${data.id}-zone-${idx + 1}`,
      name: z.zoneName,
      totalSpots: normalized.total,
      availableSpots: normalized.available,
      type: normalizeZone(z.zoneName),
      floor: 'N/D',
    };
  });
  const lotAvailability = normalizeAvailability(data.freeSpaces, data.totalSpaces);
  const coords = await getUserCoords();
  const lotCoords = { lat: data.coordinates.lat, lng: data.coordinates.lng };
  const distanceMeters = coords ? haversineMeters(coords, lotCoords) : null;
  const drivingMeters = distanceMeters !== null ? estimateDrivingMeters(distanceMeters) : null;

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    localidade: toLocalidade(data.address),
    availableSpots: lotAvailability.available,
    totalSpots: lotAvailability.total,
    hourlyRate: primaryTariff?.pricePerHour ?? 0,
    dailyMax: primaryTariff?.maxDaily ?? 0,
    monthlyRate: primaryTariff?.monthly ?? 0,
    distance: distanceMeters !== null ? formatDistance(distanceMeters) : 'N/D',
    walkingTime: distanceMeters !== null ? formatWalkingTime(distanceMeters) : 'N/D',
    drivingDistance: drivingMeters !== null ? formatDistance(drivingMeters) : 'N/D',
    drivingTime: drivingMeters !== null ? formatDrivingTime(drivingMeters) : 'N/D',
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
    techFeatures: { hasOCR: false, hasOcrIdentification: false, hasIRSensors: false, hasLEDs: false },
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
  const resp = await withGlobalLoading(() => fetch(`${API_BASE}/api/alerts`, {
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
