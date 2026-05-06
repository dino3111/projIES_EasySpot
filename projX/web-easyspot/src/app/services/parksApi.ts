import type { AccessibleSpot, EVCharger, ParkingFloor, ParkingLot, ParkingSpot, ParkingZone } from '../data/parkingTypes';
import { getAccessToken } from './authToken';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
  spotMap: Array<{ spotNumber: string; zone: string; row: number; col: number; status: ParkingSpot['status'] }>;
  evChargers: Array<{ type: EVCharger['type']; speed: EVCharger['speed']; pricePerKwh: number; availability: boolean }>;
  accessibility: Array<{ location: string; availability: boolean; distanceToEntranceMeters: number; baySize: string }>;
  tariffs: Array<{ pricePerHour: number | null; maxDaily: number | null; monthly: number | null }>;
  amenities: string[];
};

function is24Hours(openingHours: string): boolean {
  const normalized = openingHours.toLowerCase();
  return normalized.includes('24h') || normalized.includes('24 h');
}

function toLocalidade(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'N/D';
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

function mapFloors(spots: ParkDetailsResponse['spotMap']): ParkingFloor[] {
  const grouped = new Map<string, ParkingSpot[]>();
  for (const spot of spots) {
    const floorId = spot.spotNumber.includes(':') ? spot.spotNumber.split(':')[0] : 'floor-default';
    const mapped: ParkingSpot = {
      id: spot.spotNumber,
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
  const resp = await fetch(`${API_BASE}/api/parks/list?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!resp.ok) throw new Error(`Failed to fetch parks list (${resp.status})`);
  const data = (await resp.json()) as ParkListResponse;

  return {
    items: data.items.map((item) => ({
    id: item.id,
    name: item.name,
    address: item.address,
    localidade: item.city || toLocalidade(item.address),
    availableSpots: item.freeSpaces,
    totalSpots: item.totalSpaces,
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
    techFeatures: { hasOCR: false, hasRFID: false, hasIRSensors: false, hasLEDs: false },
    })),
    pagination: data.pagination,
  };
}

export async function fetchParkCities(): Promise<string[]> {
  const token = getAccessToken();
  const resp = await fetch(`${API_BASE}/api/parks/cities`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!resp.ok) return [];
  return (await resp.json()) as string[];
}

export async function fetchParkDetails(parkId: string): Promise<ParkingLot> {
  const token = getAccessToken();
  const resp = await fetch(`${API_BASE}/api/parks/${parkId}/details`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!resp.ok) throw new Error(`Failed to fetch park details (${resp.status})`);
  const data = (await resp.json()) as ParkDetailsResponse;

  const primaryTariff = data.tariffs[0];
  const evChargers: EVCharger[] = data.evChargers.map((c, idx) => ({
    id: `${data.id}-ev-${idx + 1}`,
    type: c.type,
    speed: c.speed,
    speedKW: Number.parseInt(c.speed.replace(/\D/g, ''), 10) || 0,
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
  const zones: ParkingZone[] = data.zones.map((z, idx) => ({
    id: `${data.id}-zone-${idx + 1}`,
    name: z.zoneName,
    totalSpots: z.total,
    availableSpots: z.free,
    type: normalizeZone(z.zoneName),
    floor: 'N/D',
  }));

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    localidade: toLocalidade(data.address),
    availableSpots: data.freeSpaces,
    totalSpots: data.totalSpaces,
    hourlyRate: primaryTariff?.pricePerHour ?? 0,
    dailyMax: primaryTariff?.maxDaily ?? 0,
    monthlyRate: primaryTariff?.monthly ?? 0,
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
    techFeatures: { hasOCR: false, hasRFID: false, hasIRSensors: false, hasLEDs: false },
  };
}
