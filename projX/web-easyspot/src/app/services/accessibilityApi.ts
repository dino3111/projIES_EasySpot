import { getAccessToken } from './authToken';
import { API_BASE } from '../../services/apiBase';
import { withGlobalLoading } from '../context/LoadingContext';

export interface AccessibleSpotDetail {
  id: string;
  parkingLotId: string;
  parkingLotName: string;
  parkingLotAddress: string;
  location: string;
  available: boolean;
  distanceToEntranceMeters: number;
  baySize: string;
}

export interface AccessibleSpotsResult {
  spots: AccessibleSpotDetail[];
  totalParks: number;
  availableCount: number;
}

type AccessibilityEntry = {
  location: string;
  availability: boolean;
  distanceToEntranceMeters: number;
  baySize: string;
};

type ParkListItem = {
  id: string;
  name: string;
  address: string;
  accessibleSpaces: { available: number; total: number };
};

type ParkDetailsResponse = {
  id: string;
  name: string;
  address: string;
  accessibility: AccessibilityEntry[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const token = getAccessToken();
  const resp = await withGlobalLoading(() =>
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
  );
  if (!resp.ok) throw new Error(`Request failed (${resp.status}): ${url}`);
  return resp.json() as Promise<T>;
}

export async function fetchAllAccessibleSpots(): Promise<AccessibleSpotsResult> {
  const listData = await fetchJson<{ items: ParkListItem[]; pagination: unknown }>(
    `${API_BASE}/api/parks/list?pageSize=200&filters=ACCESSIBLE`,
  );

  const parksWithAccessible = listData.items.filter((p) => p.accessibleSpaces.total > 0);

  const details = await Promise.all(
    parksWithAccessible.map((p) =>
      fetchJson<ParkDetailsResponse>(`${API_BASE}/api/parks/${p.id}/details`),
    ),
  );

  const spots: AccessibleSpotDetail[] = details.flatMap((d) =>
    d.accessibility.map((a, idx) => ({
      id: `${d.id}-acc-${idx + 1}`,
      parkingLotId: d.id,
      parkingLotName: d.name,
      parkingLotAddress: d.address,
      location: a.location,
      available: a.availability,
      distanceToEntranceMeters: a.distanceToEntranceMeters,
      baySize: a.baySize ?? '',
    })),
  );

  const availableCount = spots.filter((s) => s.available).length;

  return { spots, totalParks: parksWithAccessible.length, availableCount };
}
