import type { ParkingLot, ParkingSpot } from '../../../data/parkingTypes';

export type ReservationStep = 1 | 2 | 3 | 4;
export type SpotFilter = 'todos' | 'standard' | 'ev' | 'accessible';

export const STEPS = [
  { id: 1, label: 'Parque & Horário', icon: 'fa-solid fa-calendar-alt' },
  { id: 2, label: 'Escolha do Lugar', icon: 'fa-solid fa-car' },
  { id: 3, label: 'Confirmação',      icon: 'fa-solid fa-file-invoice' },
  { id: 4, label: 'Reservado!',       icon: 'fa-solid fa-circle-check' },
];

export const SPOT_FILTER_OPTIONS: { key: SpotFilter; label: string; icon: string }[] = [
  { key: 'todos',      label: 'Todos',     icon: 'fa-solid fa-grip' },
  { key: 'standard',   label: 'Padrão',    icon: 'fa-solid fa-square-parking' },
  { key: 'ev',         label: 'EV',        icon: 'fa-solid fa-bolt' },
  { key: 'accessible', label: 'Acessível', icon: 'fa-solid fa-wheelchair' },
];

export function getMinArrivalTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  now.setSeconds(0, 0);
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function calcHours(arrival: string, exit: string): number {
  if (!arrival || !exit) return 0;
  return Math.max(0, (new Date(exit).getTime() - new Date(arrival).getTime()) / 3600000);
}

export function fmtDuration(hours: number): string {
  if (hours <= 0) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function getDefaultExitTime(arrivalIso: string): string {
  const base = arrivalIso ? new Date(arrivalIso) : new Date(getMinArrivalTime());
  base.setHours(base.getHours() + 2);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

export const EV_CHARGING_KWH_PER_HOUR = 7;

export function calcParkingCost(lot: ParkingLot, hours: number): number {
  return Math.min(lot.hourlyRate * hours, lot.dailyMax);
}

export function calcChargingCost(lot: ParkingLot, hours: number): number {
  if (!lot.evChargingRate || lot.evChargingRate <= 0) return 0;
  return lot.evChargingRate * EV_CHARGING_KWH_PER_HOUR * hours;
}

export function calcCost(lot: ParkingLot | null, hours: number, isEVSpot = false): number {
  if (!lot) return 0;
  const parking = calcParkingCost(lot, hours);
  const charging = isEVSpot ? calcChargingCost(lot, hours) : 0;
  return parking + charging;
}

export function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function genBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = 'ES-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) c += '-';
    c += chars[Math.floor(Math.random() * chars.length)];
  }
  return c;
}

export function isSpotSelectable(spot: ParkingSpot, filter: SpotFilter): boolean {
  if (spot.status === 'occupied' || spot.status === 'reserved') return false;
  if (filter === 'ev' && spot.status !== 'ev') return false;
  if (filter === 'accessible' && spot.status !== 'accessible') return false;
  if (filter === 'standard' && (spot.status === 'ev' || spot.status === 'accessible')) return false;
  return true;
}

export function spotColorClasses(spot: ParkingSpot, selected: boolean, selectable: boolean): string {
  if (selected) return 'bg-[#1d4ed8] text-white border-[#1e40af] ring-2 ring-[#93c5fd] shadow-lg scale-110';
  if (!selectable) {
    if (spot.status === 'occupied') return 'bg-[#b91c1c] text-white border-[#7f1d1d] cursor-not-allowed opacity-90';
    if (spot.status === 'reserved') return 'bg-[#d97706] text-white border-[#92400e] cursor-not-allowed opacity-90';
    return 'bg-[#6b7280] text-white border-[#4b5563] cursor-not-allowed opacity-65';
  }
  if (spot.status === 'ev') return 'bg-[#f59e0b] text-black border-[#b45309] ring-1 ring-[#fcd34d] hover:scale-105 hover:shadow-md cursor-pointer';
  if (spot.status === 'accessible') return 'bg-[#06b6d4] text-black border-[#0e7490] ring-1 ring-[#67e8f9] hover:scale-105 hover:shadow-md cursor-pointer';
  return 'bg-[#22c55e] text-black border-[#15803d] ring-1 ring-[#86efac] hover:scale-105 hover:shadow-md cursor-pointer';
}
