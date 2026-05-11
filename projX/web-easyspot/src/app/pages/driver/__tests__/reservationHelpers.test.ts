import { describe, it, expect } from 'vitest';
import {
  calcParkingCost,
  calcChargingCost,
  calcCost,
  EV_CHARGING_KWH_PER_HOUR,
} from '../reservation/reservationHelpers';
import type { ParkingLot } from '../../../data/parkingTypes';

function makeLot(overrides: Partial<ParkingLot> = {}): ParkingLot {
  return {
    id: 'lot-1',
    name: 'Parque Teste',
    address: 'Rua A, Aveiro',
    localidade: 'Aveiro',
    availableSpots: 10,
    totalSpots: 50,
    hourlyRate: 1.5,
    dailyMax: 12.0,
    monthlyRate: 90.0,
    evChargingRate: 0,
    distance: '0m',
    walkingTime: '0min',
    hasEVCharger: false,
    hasAccessible: false,
    latitude: 40.6,
    longitude: -8.6,
    rating: 0,
    reviewCount: 0,
    openingHours: '24h',
    is24h: true,
    amenities: [],
    zones: [],
    floors: [],
    phone: 'N/D',
    techFeatures: { hasOCR: false, hasRFID: false, hasIRSensors: false, hasLEDs: false },
    ...overrides,
  };
}

describe('calcParkingCost', () => {
  it('multiplica hourlyRate por horas', () => {
    const lot = makeLot({ hourlyRate: 1.5, dailyMax: 12 });
    expect(calcParkingCost(lot, 2)).toBeCloseTo(3.0);
  });

  it('aplica teto de dailyMax', () => {
    const lot = makeLot({ hourlyRate: 1.5, dailyMax: 12 });
    expect(calcParkingCost(lot, 10)).toBeCloseTo(12.0);
  });

  it('retorna 0 com 0 horas', () => {
    const lot = makeLot({ hourlyRate: 1.5, dailyMax: 12 });
    expect(calcParkingCost(lot, 0)).toBe(0);
  });
});

describe('calcChargingCost', () => {
  it('retorna 0 quando evChargingRate é 0 (lugar não-EV)', () => {
    const lot = makeLot({ evChargingRate: 0 });
    expect(calcChargingCost(lot, 2)).toBe(0);
  });

  it('calcula custo de carregamento: rate × kWh/h × horas', () => {
    const lot = makeLot({ evChargingRate: 0.35, hasEVCharger: true });
    expect(calcChargingCost(lot, 2)).toBeCloseTo(0.35 * EV_CHARGING_KWH_PER_HOUR * 2);
  });

  it('escala linearmente com horas', () => {
    const lot = makeLot({ evChargingRate: 0.48, hasEVCharger: true });
    const cost1h = calcChargingCost(lot, 1);
    const cost2h = calcChargingCost(lot, 2);
    expect(cost2h).toBeCloseTo(cost1h * 2);
  });
});

describe('calcCost', () => {
  it('retorna 0 quando lot é null', () => {
    expect(calcCost(null, 2)).toBe(0);
  });

  it('lugar padrão: só parking, sem carregamento', () => {
    const lot = makeLot({ hourlyRate: 1.5, dailyMax: 12, evChargingRate: 0.35 });
    const cost = calcCost(lot, 2, false);
    expect(cost).toBeCloseTo(3.0);
  });

  it('lugar EV: parking + carregamento combinados', () => {
    const lot = makeLot({ hourlyRate: 1.5, dailyMax: 12, evChargingRate: 0.35, hasEVCharger: true });
    const hours = 2;
    const expectedParking = Math.min(1.5 * hours, 12);
    const expectedCharging = 0.35 * EV_CHARGING_KWH_PER_HOUR * hours;
    expect(calcCost(lot, hours, true)).toBeCloseTo(expectedParking + expectedCharging);
  });

  it('lugar EV sem evChargingRate: total = só parking', () => {
    const lot = makeLot({ hourlyRate: 1.5, dailyMax: 12, evChargingRate: 0 });
    expect(calcCost(lot, 2, true)).toBeCloseTo(3.0);
  });

  it('aplica dailyMax mesmo com carregamento EV', () => {
    const lot = makeLot({ hourlyRate: 1.5, dailyMax: 12, evChargingRate: 0.35, hasEVCharger: true });
    const hours = 10;
    const parking = 12.0;
    const charging = 0.35 * EV_CHARGING_KWH_PER_HOUR * hours;
    expect(calcCost(lot, hours, true)).toBeCloseTo(parking + charging);
  });
});
