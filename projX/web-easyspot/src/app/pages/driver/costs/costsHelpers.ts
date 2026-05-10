import type { ParkingLot } from '../../../data/parkingTypes';

export type Period = '7d' | '30d' | '3m';
export type SortBy = 'price' | 'distance' | 'ratio';

export interface ParkingWithCost extends ParkingLot {
  estimatedCost: number;
  costPerKm: number;
  occupancyForecast: Array<{ hour: string; occupancy: number }>;
}

export const COLORS = ['#7357ec', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];

export function calculateCost(lot: ParkingLot, minutes: number): number {
  const baseCost = lot.hourlyRate * (minutes / 60);
  return Math.min(baseCost, lot.dailyMax);
}

export function generateOccupancyForecast(lot: ParkingLot) {
  const currentHour = new Date().getHours();
  return Array.from({ length: 12 }, (_, i) => {
    const hour = (currentHour + i) % 24;
    let occupancy = ((lot.totalSpots - lot.availableSpots) / lot.totalSpots) * 100;
    if (hour >= 9 && hour <= 18) occupancy = Math.min(95, occupancy + Math.random() * 20);
    else if (hour >= 19 || hour <= 6) occupancy = Math.max(20, occupancy - Math.random() * 30);
    return { hour: `${String(hour).padStart(2, '0')}:00`, occupancy: Math.round(occupancy) };
  });
}
