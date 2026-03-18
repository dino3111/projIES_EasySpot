export interface EVCharger {
  id: string;
  type: 'Type 2' | 'CCS' | 'CHAdeMO' | 'Tesla Supercharger';
  speed: 'Lenta (7kW)' | 'Rápida (22kW)' | 'Ultra-rápida (50kW)' | 'Supercharger (150kW)';
  speedKW: number;
  available: boolean;
  price: number; // euros per kWh
}

export interface AccessibleSpot {
  id: string;
  zone: string;
  available: boolean;
  monitored: boolean;
  distanceToEntrance: number; // metros
  hasRampSpace: boolean;
  dimensions: string; // ex: "3.5m x 5.0m"
  sensorStatus: 'online' | 'faulty';
  ledStatus: 'green' | 'red' | 'blue' | 'yellow';
}

export type SpotStatus = 'free' | 'occupied' | 'reserved' | 'ev' | 'accessible';

export interface ParkingSpot {
  id: string;
  row: number;
  col: number;
  status: SpotStatus;
  label?: string; // e.g. "A1", "B3"
}

export interface ParkingFloor {
  id: string;
  name: string; // "Piso 0", "Piso -1", etc.
  rows: number;
  cols: number;
  spots: ParkingSpot[];
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
    chargingAmount: number; // euros
  };
}

export interface ParkingZone {
  id: string;
  name: string;
  totalSpots: number;
  availableSpots: number;
  type: 'standard' | 'ev' | 'accessible' | 'reserved';
  floor: string;
}

// ── Helper: dimensão do lugar acessível ───────────────────────────────────────
export function getSpotDimCategory(dimensions: string): {
  label: string;
  bgClass: string;
  textClass: string;
  icon: string;
} {
  const match = dimensions.match(/^([\d.]+)/);
  const width = match ? parseFloat(match[1]) : 0;
  if (width >= 4.0)
    return { label: 'Amplo', bgClass: 'bg-success/15', textClass: 'text-success', icon: 'fa-expand' };
  if (width >= 3.5)
    return { label: 'Standard', bgClass: 'bg-info/15', textClass: 'text-info', icon: 'fa-arrows-left-right' };
  return { label: 'Compacto', bgClass: 'bg-warning/15', textClass: 'text-warning', icon: 'fa-compress' };
}

// ── Helper: distância à entrada → cor ─────────────────────────────────────────
export function getDistanceColor(meters: number): { bg: string; label: string } {
  if (meters <= 20) return { bg: '#22c55e', label: `${meters}m` };
  if (meters <= 40) return { bg: '#f59e0b', label: `${meters}m` };
  return { bg: '#ef4444', label: `${meters}m` };
}

// ── Helper: generate a floor grid ─────────────────────────────────────────────
function makeFloor(
  id: string,
  name: string,
  rows: number,
  cols: number,
  occupied: number[],
  reserved: number[],
  evSpots: number[],
  accessibleSpots: number[],
): ParkingFloor {
  const spots: ParkingSpot[] = [];
  const total = rows * cols;
  const rowLabel = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    let status: SpotStatus = 'free';
    if (evSpots.includes(i)) status = 'ev';
    else if (accessibleSpots.includes(i)) status = 'accessible';
    else if (reserved.includes(i)) status = 'reserved';
    else if (occupied.includes(i)) status = 'occupied';
    spots.push({
      id: `${id}-s${i}`,
      row,
      col,
      status,
      label: `${rowLabel[row] || '?'}${col + 1}`,
    });
  }
  return { id, name, rows, cols, spots };
}

export const mockParkingLots: ParkingLot[] = [
  // ─── Coimbra ──────────────────────────────────────────────────────────────
  {
    id: 'coimbra-1',
    name: 'Estádio Cidade de Coimbra',
    address: 'Rua Dom Manuel I, Coimbra',
    localidade: 'Coimbra',
    availableSpots: 48,
    totalSpots: 120,
    hourlyRate: 1.80,
    dailyMax: 14.00,
    monthlyRate: 140.00,
    distance: '0.7 km',
    walkingTime: '9 min',
    hasEVCharger: true,
    hasAccessible: true,
    latitude: 40.203203,
    longitude: -8.406216,
    rating: 4.4,
    reviewCount: 112,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 23 900 0001',
    amenities: ['vigilância', 'câmeras', 'elevador', 'wc'],
    techFeatures: { hasOCR: true, hasRFID: true, hasIRSensors: true, hasLEDs: true },
    evChargers: [
      { id: 'ev-c1-1', type: 'Type 2',  speed: 'Rápida (22kW)',       speedKW: 22,  available: true,  price: 0.32 },
      { id: 'ev-c1-2', type: 'CCS',     speed: 'Ultra-rápida (50kW)', speedKW: 50,  available: false, price: 0.40 },
    ],
    accessibleSpots: [
      { id: 'ac-c1-1', zone: 'Piso 0 — Entrada Norte', available: true,  monitored: true,  distanceToEntrance: 12, hasRampSpace: true,  dimensions: '4.0m x 5.5m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-c1-2', zone: 'Piso 0 — Entrada Sul',   available: false, monitored: true,  distanceToEntrance: 28, hasRampSpace: true,  dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'red'   },
      { id: 'ac-c1-3', zone: 'Piso -1 — Elevador',     available: true,  monitored: false, distanceToEntrance: 52, hasRampSpace: false, dimensions: '3.2m x 4.8m', sensorStatus: 'faulty', ledStatus: 'yellow'},
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',    type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)',  type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z3', name: 'Carregamento EV',        type: 'ev',         totalSpots: 10, availableSpots: 8,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',    type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-c1-p0', 'Piso 0', 6, 10, [1,3,5,7,9,11], [], [50,51], [0]),
      makeFloor('f-c1-p-1', 'Piso -1', 6, 10, [2,4,6], [12,13], [], []),
    ],
  },
  {
    id: 'coimbra-2',
    name: 'CoimbraShopping',
    address: 'Av. Mendes Silva, Coimbra',
    localidade: 'Coimbra',
    availableSpots: 15,
    totalSpots: 60,
    hourlyRate: 1.50,
    dailyMax: 12.00,
    monthlyRate: 110.00,
    distance: '2.5 km',
    walkingTime: '30 min',
    hasEVCharger: false,
    hasAccessible: true,
    latitude: 40.194209,
    longitude: -8.409651,
    rating: 4.1,
    reviewCount: 45,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 23 900 0011',
    amenities: ['câmeras'],
    techFeatures: { hasOCR: true, hasRFID: false, hasIRSensors: false, hasLEDs: false },
    accessibleSpots: [
      { id: 'ac-c2-1', zone: 'Piso 0 — Entrada Principal', available: true,  monitored: true,  distanceToEntrance: 15, hasRampSpace: true,  dimensions: '4.5m x 5.5m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-c2-2', zone: 'Piso 0 — Lado Oeste',        available: false, monitored: false, distanceToEntrance: 35, hasRampSpace: false, dimensions: '3.2m x 4.8m', sensorStatus: 'online', ledStatus: 'red'   },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',    type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)',  type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',    type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-c2-p0',  'Piso 0',  5, 12, [2,5,8,12,15], [], [], [1]),
      makeFloor('f-c2-p-1', 'Piso -1', 5, 12, [1,3,10], [], [], []),
    ],
  },

  // ─── Aveiro ───────────────────────────────────────────────────────────────
  {
    id: 'aveiro-1',
    name: 'Fórum Aveiro',
    address: 'R. do Batalhão de Caçadores 10, Aveiro',
    localidade: 'Aveiro',
    availableSpots: 22,
    totalSpots: 85,
    hourlyRate: 1.50,
    dailyMax: 12.00,
    monthlyRate: 120.00,
    distance: '0.4 km',
    walkingTime: '5 min',
    hasEVCharger: true,
    hasAccessible: true,
    latitude: 40.640957,
    longitude: -8.651345,
    rating: 4.2,
    reviewCount: 98,
    openingHours: '07h00 - 23h00',
    is24h: false,
    phone: '+351 23 400 0002',
    amenities: ['câmeras', 'elevador', 'wc'],
    techFeatures: { hasOCR: true, hasRFID: true, hasIRSensors: true, hasLEDs: true },
    evChargers: [
      { id: 'ev-a1-1', type: 'Type 2', speed: 'Rápida (22kW)',       speedKW: 22, available: true,  price: 0.38 },
      { id: 'ev-a1-2', type: 'CCS',   speed: 'Ultra-rápida (50kW)', speedKW: 50, available: true,  price: 0.45 },
    ],
    accessibleSpots: [
      { id: 'ac-a1-1', zone: 'Piso 0 — Entrada Fórum',   available: true,  monitored: true,  distanceToEntrance: 8,  hasRampSpace: true,  dimensions: '4.0m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-a1-2', zone: 'Piso 0 — Saída Lateral',   available: true,  monitored: true,  distanceToEntrance: 22, hasRampSpace: true,  dimensions: '3.8m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-a1-3', zone: 'Piso -1 — Junto Elevador', available: false, monitored: false, distanceToEntrance: 48, hasRampSpace: false, dimensions: '3.2m x 4.8m', sensorStatus: 'faulty', ledStatus: 'red'   },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z3', name: 'Carregamento EV',       type: 'ev',         totalSpots: 10, availableSpots: 8,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-a1-p0', 'Piso 0', 5, 17, [1,4,7,10,13], [], [80], [0]),
      makeFloor('f-a1-p-1', 'Piso -1', 5, 17, [2,5,11], [20,21], [], []),
    ],
  },
  {
    id: 'aveiro-2',
    name: 'Glicínias Plaza',
    address: 'R. Eng. Von Haff, Aveiro',
    localidade: 'Aveiro',
    availableSpots: 50,
    totalSpots: 150,
    hourlyRate: 1.00,
    dailyMax: 8.00,
    monthlyRate: 80.00,
    distance: '1.8 km',
    walkingTime: '22 min',
    hasEVCharger: true,
    hasAccessible: true,
    latitude: 40.625991,
    longitude: -8.644003,
    rating: 3.9,
    reviewCount: 156,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 23 400 0022',
    amenities: ['vigilância'],
    techFeatures: { hasOCR: true, hasRFID: false, hasIRSensors: false, hasLEDs: true },
    evChargers: [
      { id: 'ev-a2-1', type: 'Type 2', speed: 'Lenta (7kW)',         speedKW: 7,  available: true,  price: 0.28 },
      { id: 'ev-a2-2', type: 'CCS',   speed: 'Ultra-rápida (50kW)', speedKW: 50, available: false, price: 0.42 },
    ],
    accessibleSpots: [
      { id: 'ac-a2-1', zone: 'Piso 0 — Entrada Principal', available: true,  monitored: true,  distanceToEntrance: 10, hasRampSpace: true,  dimensions: '4.5m x 5.5m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-a2-2', zone: 'Piso 0 — Ala Norte',         available: false, monitored: true,  distanceToEntrance: 30, hasRampSpace: true,  dimensions: '4.0m x 5.0m', sensorStatus: 'online', ledStatus: 'red'   },
      { id: 'ac-a2-3', zone: 'Piso -1 — Zona B',           available: true,  monitored: false, distanceToEntrance: 45, hasRampSpace: false, dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z3', name: 'Carregamento EV',       type: 'ev',         totalSpots: 10, availableSpots: 8,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-a2-p0',  'Piso 0',  10, 15, [10,20,30,40,50], [], [140], [0]),
      makeFloor('f-a2-p-1', 'Piso -1', 10, 15, [5,15,25], [], [], []),
      makeFloor('f-a2-p-2', 'Piso -2', 10, 15, [2,8], [], [], []),
    ],
  },

  // ─── Leiria ───────────────────────────────────────────────────────────────
  {
    id: 'leiria-1',
    name: 'Europa',
    address: 'Avenida Marquês de Pombal, Leiria',
    localidade: 'Leiria',
    availableSpots: 10,
    totalSpots: 90,
    hourlyRate: 1.60,
    dailyMax: 13.00,
    monthlyRate: 130.00,
    distance: '0.6 km',
    walkingTime: '8 min',
    hasEVCharger: false,
    hasAccessible: true,
    latitude: 39.739704,
    longitude: -8.806770,
    rating: 3.7,
    reviewCount: 61,
    openingHours: '06h00 - 00h00',
    is24h: false,
    phone: '+351 24 400 0003',
    amenities: ['câmeras'],
    techFeatures: { hasOCR: true, hasRFID: true, hasIRSensors: false, hasLEDs: false },
    accessibleSpots: [
      { id: 'ac-l1-1', zone: 'Piso 0 — Entrada Marquês', available: false, monitored: true,  distanceToEntrance: 18, hasRampSpace: true,  dimensions: '3.8m x 5.0m', sensorStatus: 'online', ledStatus: 'red'   },
      { id: 'ac-l1-2', zone: 'Piso 1 — Zona C',          available: true,  monitored: false, distanceToEntrance: 42, hasRampSpace: false, dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-l1-p0', 'Piso 0', 6, 15, [5,10,15,20], [], [], [0]),
      makeFloor('f-l1-p1', 'Piso 1', 6, 15, [1,6,11], [], [], []),
    ],
  },
  {
    id: 'leiria-2',
    name: 'Estádio Municipal Dr. Magalhães Pessoa',
    address: 'Caminho da Ribeira, Leiria',
    localidade: 'Leiria',
    availableSpots: 120,
    totalSpots: 300,
    hourlyRate: 0.80,
    dailyMax: 6.00,
    monthlyRate: 50.00,
    distance: '1.5 km',
    walkingTime: '18 min',
    hasEVCharger: true,
    hasAccessible: true,
    latitude: 39.748730,
    longitude: -8.812917,
    rating: 4.0,
    reviewCount: 210,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 24 400 0033',
    amenities: ['wc'],
    techFeatures: { hasOCR: true, hasRFID: false, hasIRSensors: false, hasLEDs: false },
    evChargers: [
      { id: 'ev-l2-1', type: 'Type 2', speed: 'Rápida (22kW)',       speedKW: 22, available: true,  price: 0.30 },
      { id: 'ev-l2-2', type: 'CCS',   speed: 'Ultra-rápida (50kW)', speedKW: 50, available: true,  price: 0.38 },
      { id: 'ev-l2-3', type: 'Type 2', speed: 'Lenta (7kW)',         speedKW: 7,  available: false, price: 0.25 },
    ],
    accessibleSpots: [
      { id: 'ac-l2-1', zone: 'Piso 0 — Portão A',     available: true,  monitored: true,  distanceToEntrance: 15, hasRampSpace: true,  dimensions: '4.0m x 5.5m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-l2-2', zone: 'Piso 0 — Portão B',     available: true,  monitored: true,  distanceToEntrance: 25, hasRampSpace: true,  dimensions: '4.5m x 5.5m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-l2-3', zone: 'Piso 0 — Ala Sul',      available: false, monitored: true,  distanceToEntrance: 38, hasRampSpace: true,  dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'red'   },
      { id: 'ac-l2-4', zone: 'Piso -1 — Zona Remota', available: true,  monitored: false, distanceToEntrance: 60, hasRampSpace: false, dimensions: '3.2m x 4.8m', sensorStatus: 'faulty', ledStatus: 'yellow'},
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z3', name: 'Carregamento EV',       type: 'ev',         totalSpots: 10, availableSpots: 8,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-l2-p0',  'Piso 0',  15, 20, [1,2,3,4,5], [], [290], [0]),
      makeFloor('f-l2-p-1', 'Piso -1', 15, 20, [10,20,30], [], [], []),
    ],
  },

  // ─── Figueira da Foz ──────────────────────────────────────────────────────
  {
    id: 'figueira-1',
    name: 'Gaivotas',
    address: 'Av. do Mar, Figueira da Foz',
    localidade: 'Figueira da Foz',
    availableSpots: 30,
    totalSpots: 70,
    hourlyRate: 1.00,
    dailyMax: 8.00,
    monthlyRate: 70.00,
    distance: '0.8 km',
    walkingTime: '10 min',
    hasEVCharger: false,
    hasAccessible: true,
    latitude: 40.150000,
    longitude: -8.868000,
    rating: 4.0,
    reviewCount: 50,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 23 300 0014',
    amenities: ['câmeras'],
    techFeatures: { hasOCR: true, hasRFID: false, hasIRSensors: false, hasLEDs: true },
    accessibleSpots: [
      { id: 'ac-f1-1', zone: 'Piso 0 — Frente Mar',   available: true,  monitored: true,  distanceToEntrance: 20, hasRampSpace: true,  dimensions: '3.8m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-f1-2', zone: 'Piso 1 — Zona Interior', available: false, monitored: false, distanceToEntrance: 45, hasRampSpace: false, dimensions: '3.2m x 4.8m', sensorStatus: 'online', ledStatus: 'red'   },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-f1-p0', 'Piso 0', 7, 10, [1,10,20], [], [], [0]),
      makeFloor('f-f1-p1', 'Piso 1', 7, 10, [5,15], [30], [], []),
    ],
  },
  {
    id: 'figueira-2',
    name: 'Foz Plaza',
    address: 'Rua dos Condados, Buarcos, Figueira da Foz',
    localidade: 'Figueira da Foz',
    availableSpots: 80,
    totalSpots: 250,
    hourlyRate: 1.20,
    dailyMax: 10.00,
    monthlyRate: 90.00,
    distance: '2.2 km',
    walkingTime: '28 min',
    hasEVCharger: true,
    hasAccessible: true,
    latitude: 40.166273,
    longitude: -8.860748,
    rating: 4.3,
    reviewCount: 180,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 23 300 0044',
    amenities: ['wc', 'loja'],
    techFeatures: { hasOCR: true, hasRFID: true, hasIRSensors: true, hasLEDs: true },
    evChargers: [
      { id: 'ev-f2-1', type: 'Tesla Supercharger', speed: 'Supercharger (150kW)', speedKW: 150, available: true,  price: 0.48 },
      { id: 'ev-f2-2', type: 'CCS',                speed: 'Ultra-rápida (50kW)', speedKW: 50,  available: true,  price: 0.42 },
      { id: 'ev-f2-3', type: 'Type 2',             speed: 'Rápida (22kW)',       speedKW: 22,  available: false, price: 0.35 },
    ],
    accessibleSpots: [
      { id: 'ac-f2-1', zone: 'Piso 0 — Entrada Buarcos',  available: true,  monitored: true,  distanceToEntrance: 12, hasRampSpace: true,  dimensions: '4.0m x 5.5m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-f2-2', zone: 'Piso 0 — Entrada Norte',    available: false, monitored: true,  distanceToEntrance: 28, hasRampSpace: true,  dimensions: '3.8m x 5.0m', sensorStatus: 'online', ledStatus: 'red'   },
      { id: 'ac-f2-3', zone: 'Piso -1 — Zona Comercial',  available: true,  monitored: true,  distanceToEntrance: 50, hasRampSpace: false, dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z3', name: 'Carregamento EV',       type: 'ev',         totalSpots: 10, availableSpots: 8,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-f2-p0',  'Piso 0',  10, 25, [1,2,3,4,5], [], [240], [0]),
      makeFloor('f-f2-p-1', 'Piso -1', 10, 25, [10,15], [], [], []),
    ],
  },

  // ─── Ovar ─────────────────────────────────────────────────────────────────
  {
    id: 'ovar-1',
    name: 'Estação Ferroviária de Ovar',
    address: 'Largo da Estação, Ovar',
    localidade: 'Ovar',
    availableSpots: 10,
    totalSpots: 48,
    hourlyRate: 0.80,
    dailyMax: 6.00,
    monthlyRate: 60.00,
    distance: '0.3 km',
    walkingTime: '4 min',
    hasEVCharger: false,
    hasAccessible: false,
    latitude: 40.864003,
    longitude: -8.616823,
    rating: 3.6,
    reviewCount: 27,
    openingHours: '08h00 - 22h00',
    is24h: false,
    phone: '+351 25 600 0005',
    amenities: ['câmeras'],
    techFeatures: { hasOCR: false, hasRFID: false, hasIRSensors: false, hasLEDs: false },
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard', totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard', totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-o1-p0',  'Piso 0',  6, 8, [1,2,3], [], [], []),
      makeFloor('f-o1-p-1', 'Piso -1', 6, 8, [4,5], [], [], []),
    ],
  },
  {
    id: 'ovar-2',
    name: 'Praia do Furadouro',
    address: 'Av. Central, Furadouro',
    localidade: 'Ovar',
    availableSpots: 100,
    totalSpots: 120,
    hourlyRate: 0.40,
    dailyMax: 3.00,
    monthlyRate: 30.00,
    distance: '1.4 km',
    walkingTime: '17 min',
    hasEVCharger: true,
    hasAccessible: true,
    latitude: 40.875153,
    longitude: -8.676797,
    rating: 3.8,
    reviewCount: 42,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 25 600 0055',
    amenities: [],
    techFeatures: { hasOCR: true, hasRFID: false, hasIRSensors: false, hasLEDs: false },
    evChargers: [
      { id: 'ev-o2-1', type: 'Type 2', speed: 'Rápida (22kW)', speedKW: 22, available: true,  price: 0.30 },
    ],
    accessibleSpots: [
      { id: 'ac-o2-1', zone: 'Piso 0 — Frente à Praia', available: true,  monitored: false, distanceToEntrance: 25, hasRampSpace: true,  dimensions: '3.8m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-o2-2', zone: 'Piso 1 — Zona B',         available: false, monitored: false, distanceToEntrance: 55, hasRampSpace: false, dimensions: '3.2m x 4.8m', sensorStatus: 'online', ledStatus: 'red'   },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z3', name: 'Carregamento EV',       type: 'ev',         totalSpots: 10, availableSpots: 8,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-o2-p0', 'Piso 0', 10, 12, [1,4,7], [], [115], [0]),
      makeFloor('f-o2-p1', 'Piso 1', 10, 12, [2,5], [20,21], [], []),
    ],
  },

  // ── Arganil ──────────────────────────────────────────────────────────────
  {
    id: 'arganil-1',
    name: 'Mercado Municipal de Arganil',
    address: 'Av. José Augusto de Carvalho, Arganil',
    localidade: 'Arganil',
    availableSpots: 20,
    totalSpots: 60,
    hourlyRate: 0.60,
    dailyMax: 4.50,
    monthlyRate: 45.00,
    distance: '0.2 km',
    walkingTime: '3 min',
    hasEVCharger: true,
    hasAccessible: true,
    latitude: 40.215495,
    longitude: -8.051295,
    rating: 4.1,
    reviewCount: 44,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 23 500 0006',
    amenities: ['câmeras', 'elevador'],
    techFeatures: { hasOCR: true, hasRFID: true, hasIRSensors: true, hasLEDs: true },
    evChargers: [
      { id: 'ev-ar1-1', type: 'Type 2', speed: 'Rápida (22kW)', speedKW: 22, available: true,  price: 0.32 },
      { id: 'ev-ar1-2', type: 'CCS',   speed: 'Ultra-rápida (50kW)', speedKW: 50, available: false, price: 0.40 },
    ],
    accessibleSpots: [
      { id: 'ac-ar1-1', zone: 'Piso 0 — Entrada Mercado',  available: true,  monitored: true,  distanceToEntrance: 5,  hasRampSpace: true,  dimensions: '4.5m x 5.5m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-ar1-2', zone: 'Piso 0 — Ala Poente',       available: false, monitored: true,  distanceToEntrance: 30, hasRampSpace: true,  dimensions: '3.8m x 5.0m', sensorStatus: 'online', ledStatus: 'red'   },
      { id: 'ac-ar1-3', zone: 'Piso 1 — Zona Coberta',     available: true,  monitored: false, distanceToEntrance: 42, hasRampSpace: false, dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z3', name: 'Carregamento EV',       type: 'ev',         totalSpots: 10, availableSpots: 8,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-ar1-p0', 'Piso 0', 6, 10, [1,4,7], [], [58], [0]),
      makeFloor('f-ar1-p1', 'Piso 1', 6, 10, [2,5], [], [], []),
    ],
  },
  {
    id: 'arganil-2',
    name: 'Montalto',
    address: 'R. do Montalto, Arganil',
    localidade: 'Arganil',
    availableSpots: 95,
    totalSpots: 100,
    hourlyRate: 0.30,
    dailyMax: 2.50,
    monthlyRate: 20.00,
    distance: '2.5 km',
    walkingTime: '32 min',
    hasEVCharger: false,
    hasAccessible: true,
    latitude: 40.216063,
    longitude: -8.031704,
    rating: 4.5,
    reviewCount: 15,
    openingHours: 'Aberto 24h',
    is24h: true,
    phone: '+351 23 500 0066',
    amenities: [],
    techFeatures: { hasOCR: false, hasRFID: false, hasIRSensors: false, hasLEDs: false },
    accessibleSpots: [
      { id: 'ac-ar2-1', zone: 'Piso 0 — Zona Central',  available: true,  monitored: false, distanceToEntrance: 10, hasRampSpace: true,  dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'green' },
      { id: 'ac-ar2-2', zone: 'Piso -1 — Fundo',        available: true,  monitored: false, distanceToEntrance: 38, hasRampSpace: false, dimensions: '3.2m x 4.8m', sensorStatus: 'online', ledStatus: 'green' },
    ],
    zones: [
      { id: 'z1', name: 'Zona Verde (Normal)',   type: 'standard',   totalSpots: 40, availableSpots: 12, floor: 'Piso 0' },
      { id: 'z2', name: 'Zona Azul (Comercial)', type: 'standard',   totalSpots: 30, availableSpots: 5,  floor: 'Piso 0' },
      { id: 'z4', name: 'Mobilidade Reduzida',   type: 'accessible', totalSpots: 5,  availableSpots: 2,  floor: 'Piso 0' },
    ],
    floors: [
      makeFloor('f-ar2-p0',  'Piso 0',  10, 10, [1,2,3], [], [], [0]),
      makeFloor('f-ar2-p-1', 'Piso -1', 10, 10, [4,5], [], [], []),
    ],
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'exp-1',
    parkingLotName: 'Estádio Municipal',
    date: '2026-03-05',
    duration: '2h 15m',
    amount: 4.05,
    vehicle: 'Renault Zoe',
    evCharging: { kWh: 18.5, chargerType: 'CCS (50kW)', chargingAmount: 7.77 },
  },
  {
    id: 'exp-2',
    parkingLotName: 'Centro de Arganil',
    date: '2026-03-02',
    duration: '45m',
    amount: 0.45,
    vehicle: 'Seat Ibiza',
  },
];

export function simulateRealTimeUpdate(parkingLot: ParkingLot): ParkingLot {
  const change = Math.floor(Math.random() * 7) - 3;
  const newAvailable = Math.max(0, Math.min(parkingLot.totalSpots, parkingLot.availableSpots + change));

  const updatedChargers = parkingLot.evChargers?.map((charger) => {
    if (Math.random() > 0.8) return { ...charger, available: !charger.available };
    return charger;
  });

  const updatedAccessible = parkingLot.accessibleSpots?.map((spot) => {
    if (Math.random() > 0.9) return { ...spot, available: !spot.available };
    return spot;
  });

  return {
    ...parkingLot,
    availableSpots: newAvailable,
    evChargers: updatedChargers,
    accessibleSpots: updatedAccessible,
  };
}
