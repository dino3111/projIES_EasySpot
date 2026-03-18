import type { ParkingLot, ParkingSpot } from '../../../data/parkingData';

export type ReservaStep = 1 | 2 | 3 | 4;
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

export function calcCost(lot: ParkingLot | null, hours: number): number {
  if (!lot) return 0;
  return Math.min(lot.hourlyRate * hours, lot.dailyMax);
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
  if (selected) return 'bg-primary text-primary-content border-primary shadow-md scale-110';
  if (!selectable) {
    if (spot.status === 'occupied') return 'bg-error/80 text-error-content cursor-not-allowed opacity-80';
    if (spot.status === 'reserved') return 'bg-base-300 text-base-content/40 cursor-not-allowed opacity-60';
    return 'bg-base-300 text-base-content/30 cursor-not-allowed opacity-50';
  }
  if (spot.status === 'ev') return 'bg-warning text-warning-content hover:scale-105 hover:shadow cursor-pointer border-warning';
  if (spot.status === 'accessible') return 'bg-info text-info-content hover:scale-105 hover:shadow cursor-pointer border-info';
  return 'bg-success/80 text-success-content hover:scale-105 hover:shadow cursor-pointer border-success/50';
}
