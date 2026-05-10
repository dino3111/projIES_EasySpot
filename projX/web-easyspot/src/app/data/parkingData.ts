export type { ParkingLot, Expense, EVCharger, AccessibleSpot, ParkingSpot, ParkingFloor, ParkingZone, SpotStatus } from './parkingTypes';
export { getSpotDimCategory, getDistanceColor } from './parkingTypes';

import type { Expense } from './parkingTypes';

export const mockExpenses: Expense[] = [
  { id: 'exp-1', parkingLotName: 'Fórum Aveiro',                      date: '2026-03-07', duration: '2h 00m', amount: 3.00 },
  { id: 'exp-2', parkingLotName: 'Parque de São Domingos',             date: '2026-03-05', duration: '3h 30m', amount: 5.25 },
  { id: 'exp-3', parkingLotName: 'Estação Ferroviária de Ovar',        date: '2026-03-01', duration: '1h 00m', amount: 0.80 },
  {
    id: 'exp-4', parkingLotName: 'Fórum Aveiro',                       date: '2026-02-25', duration: '1h 30m', amount: 2.25,
    evCharging: { kWh: 10, chargerType: 'Type 2 (7kW)', chargingAmount: 2.80 },
  },
  { id: 'exp-5', parkingLotName: 'Estádio Municipal Dr. Magalhães Pessoa', date: '2026-02-20', duration: '2h 30m', amount: 4.50 },
];
