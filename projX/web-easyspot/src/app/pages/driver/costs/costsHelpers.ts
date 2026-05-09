import type { ParkingLot, Expense } from '../../../data/parkingTypes';

export type Period = '7d' | '30d' | '3m';
export type SortBy = 'price' | 'distance' | 'ratio';

export interface ParkingWithCost extends ParkingLot {
  estimatedCost: number;
  costPerKm: number;
  occupancyForecast: Array<{ hour: string; occupancy: number }>;
}

export const mockExpenses: Expense[] = [
  { id: 'exp-1', parkingLotName: 'Parque Central', date: '2026-03-07', duration: '1h 00m', amount: 1.5, vehicle: 'AA-11-BB' },
  { id: 'exp-2', parkingLotName: 'Parque da Estação', date: '2026-03-05', duration: '2h 00m', amount: 3.2, vehicle: 'AA-11-BB' },
  { id: 'exp-3', parkingLotName: 'Fórum Aveiro', date: '2026-03-02', duration: '1h 30m', amount: 2.1, vehicle: 'CC-22-DD' },
  { id: 'exp-4', parkingLotName: 'Parque Central', date: '2026-02-28', duration: '0h 45m', amount: 1.0, vehicle: 'AA-11-BB' },
  { id: 'exp-5', parkingLotName: 'Parque da Estação', date: '2026-02-25', duration: '3h 00m', amount: 4.8, vehicle: 'CC-22-DD' },
];

export const allExpenses: (Expense & { vehicle?: string })[] = [
  ...mockExpenses,
  { id: 'exp-6',  parkingLotName: 'Parque das Gaivotas',   date: '2026-03-06', duration: '1h 30m', amount: 2.1, vehicle: 'Seat Ibiza' },
  { id: 'exp-7',  parkingLotName: 'Estação Ferroviária de Ovar', date: '2026-03-04', duration: '2h 00m', amount: 1.6, vehicle: 'Seat Ibiza' },
  { id: 'exp-8',  parkingLotName: 'Fórum Aveiro',          date: '2026-03-03', duration: '1h 15m', amount: 1.88, vehicle: 'Renault Zoe',
    evCharging: { kWh: 14, chargerType: 'Type 2 (7kW)', chargingAmount: 3.92 } },
  { id: 'exp-9',  parkingLotName: 'Estádio Municipal Dr. Magalhães Pessoa', date: '2026-02-27', duration: '4h 00m', amount: 7.2, vehicle: 'Renault Zoe',
    evCharging: { kWh: 22, chargerType: 'CCS (50kW)', chargingAmount: 9.24 } },
  { id: 'exp-10', parkingLotName: 'Estação Ferroviária de Ovar', date: '2026-02-22', duration: '1h 00m', amount: 0.8, vehicle: 'Seat Ibiza' },
  { id: 'exp-11', parkingLotName: 'Parque das Gaivotas',   date: '2026-02-18', duration: '6h 00m', amount: 8.4, vehicle: 'Seat Ibiza' },
  { id: 'exp-12', parkingLotName: 'Mercado Municipal de Arganil', date: '2026-02-15', duration: '0h 30m', amount: 0.3, vehicle: 'Seat Ibiza' },
  { id: 'exp-13', parkingLotName: 'Estádio Cidade de Coimbra', date: '2026-02-10', duration: '3h 00m', amount: 5.4, vehicle: 'Renault Zoe',
    evCharging: { kWh: 12.5, chargerType: 'CCS (50kW)', chargingAmount: 5.25 } },
  { id: 'exp-14', parkingLotName: 'Parque de São Domingos', date: '2026-01-28', duration: '4h 30m', amount: 7.2, vehicle: 'Seat Ibiza' },
  { id: 'exp-15', parkingLotName: 'Fórum Aveiro',          date: '2026-01-20', duration: '2h 00m', amount: 3, vehicle: 'Renault Zoe',
    evCharging: { kWh: 8, chargerType: 'Type 2 (7kW)', chargingAmount: 2.24 } },
];

export const COLORS = ['#7357ec', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];
export const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '3m': 90 };

export function filterByPeriod(expenses: typeof allExpenses, period: Period) {
  const now = new Date('2026-03-07');
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
  return expenses.filter((e) => new Date(e.date) >= cutoff);
}

export function buildAreaData(expenses: typeof allExpenses, period: Period) {
  const days = PERIOD_DAYS[period];
  const map: Record<string, number> = {};
  const now = new Date('2026-03-07');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = 0;
  }
  expenses.forEach((e) => {
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    if (map[e.date] !== undefined) map[e.date] += total;
  });
  return Object.entries(map).map(([date, total], index) => ({
    date: new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
    total,
    key: `${date}-${index}`,
  }));
}

export function buildPieData(expenses: typeof allExpenses) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    map[e.parkingLotName] = (map[e.parkingLotName] ?? 0) + total;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);
}

export function buildVehicleData(expenses: typeof allExpenses) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const v = e.vehicle ?? 'Seat Ibiza';
    const total = e.amount + (e.evCharging?.chargingAmount ?? 0);
    map[v] = (map[v] ?? 0) + total;
  });
  return Object.entries(map).map(([name, total]) => ({ name, total: +total.toFixed(2) }));
}

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
