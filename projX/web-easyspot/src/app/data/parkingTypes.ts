export interface EVCharger {
  id: string;
  type: 'Type 2' | 'CCS' | 'CHAdeMO' | 'Tesla Supercharger';
  speed: 'Lenta (7kW)' | 'Rápida (22kW)' | 'Ultra-rápida (50kW)' | 'Supercharger (150kW)';
  speedKW: number;
  available: boolean;
  price: number;
}

export interface AccessibleSpot {
  id: string;
  zone: string;
  available: boolean;
  monitored: boolean;
  distanceToEntrance: number;
  hasRampSpace: boolean;
  dimensions: string;
  sensorStatus: 'online' | 'faulty';
  ledStatus: 'green' | 'red' | 'blue' | 'yellow';
}

export type SpotStatus = 'free' | 'occupied' | 'reserved' | 'ev' | 'accessible';

export interface ParkingSpot {
  id: string;
  row: number;
  col: number;
  status: SpotStatus;
  label?: string;
}

export interface ParkingFloor {
  id: string;
  name: string;
  rows: number;
  cols: number;
  spots: ParkingSpot[];
}

export interface ParkingZone {
  id: string;
  name: string;
  totalSpots: number;
  availableSpots: number;
  type: 'standard' | 'ev' | 'accessible' | 'reserved';
  floor: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  localidade: string;
  availableSpots: number;
  totalSpots: number;
  hourlyRate: number;
  dailyMax: number;
  monthlyRate: number;
  evChargingRate: number;
  distance: string;
  walkingTime: string;
  hasEVCharger: boolean;
  hasAccessible: boolean;
  latitude: number;
  longitude: number;
  evChargers?: EVCharger[];
  accessibleSpots?: AccessibleSpot[];
  rating: number;
  reviewCount: number;
  openingHours: string;
  is24h: boolean;
  amenities: string[];
  zones: ParkingZone[];
  floors: ParkingFloor[];
  phone: string;
  techFeatures: {
    hasOCR: boolean;
    hasRFID: boolean;
    hasIRSensors: boolean;
    hasLEDs: boolean;
  };
}

export interface Expense {
  id: string;
  parkingLotName: string;
  date: string;
  duration: string;
  amount: number;
  vehicle?: string;
  evCharging?: {
    kWh: number;
    chargerType: string;
    chargingAmount: number;
  };
}

export function getSpotDimCategory(dimensions: string): {
  label: string;
  bgClass: string;
  textClass: string;
  icon: string;
} {
  const match = /^([\d.]+)/.exec(dimensions);
  const width = match ? Number.parseFloat(match[1]) : 0;
  if (width >= 4) return { label: 'Amplo', bgClass: 'bg-success/15', textClass: 'text-success', icon: 'fa-expand' };
  if (width >= 3.5) return { label: 'Standard', bgClass: 'bg-info/15', textClass: 'text-info', icon: 'fa-arrows-left-right' };
  return { label: 'Compacto', bgClass: 'bg-warning/15', textClass: 'text-warning', icon: 'fa-compress' };
}

export function getDistanceColor(meters: number): { bg: string; label: string } {
  if (meters <= 20) return { bg: '#22c55e', label: `${meters}m` };
  if (meters <= 40) return { bg: '#f59e0b', label: `${meters}m` };
  return { bg: '#ef4444', label: `${meters}m` };
}

