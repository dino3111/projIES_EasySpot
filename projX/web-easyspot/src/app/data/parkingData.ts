import type { Expense, ParkingLot } from './parkingTypes';

export type { Expense, ParkingLot } from './parkingTypes';

export const mockExpenses: Expense[] = [
  { id: 'exp-1', parkingLotName: 'Fórum Aveiro', date: '2026-03-07', duration: '2h 00m', amount: 3.0 },
  { id: 'exp-2', parkingLotName: 'Glicínias Plaza', date: '2026-03-06', duration: '1h 30m', amount: 1.5 },
  {
    id: 'exp-3',
    parkingLotName: 'Estádio Cidade de Coimbra',
    date: '2026-03-05',
    duration: '3h 00m',
    amount: 5.4,
    evCharging: { kWh: 10, chargerType: 'CCS (50kW)', chargingAmount: 4.2 },
  },
  { id: 'exp-4', parkingLotName: 'Mercado Municipal de Arganil', date: '2026-03-03', duration: '1h 00m', amount: 0.6 },
  { id: 'exp-5', parkingLotName: 'CoimbraShopping', date: '2026-03-02', duration: '2h 30m', amount: 3.75 },
];
