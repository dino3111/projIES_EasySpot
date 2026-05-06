import type { ParkingLot } from '../data/parkingTypes';
import { fetchParkDetails, fetchParksList } from './parksApi';

export async function fetchAllParksSummary(): Promise<ParkingLot[]> {
  const data = await fetchParksList({ page: 1, pageSize: 500 });
  return data.items;
}

export async function fetchParkDetailsById(id: string): Promise<ParkingLot | null> {
  try {
    return await fetchParkDetails(id);
  } catch {
    return null;
  }
}

