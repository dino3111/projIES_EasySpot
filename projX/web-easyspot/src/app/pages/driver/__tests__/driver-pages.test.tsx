import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { ParkingListPage } from '../ParkingListPage';
import { ParkingDetail } from '../parking/ParkingDetail';
import { MapPage } from '../MapPage';
import { FavoritesPage } from '../FavoritesPage';
import { ProfilePage } from '../ProfilePage';

vi.mock('../../../context/ProfileContext', () => ({
  useProfile: vi.fn(() => ({
    profile: 'DRIVER',
    accountType: 'DRIVER',
    driverType: 'ev',
    setDriverType: vi.fn(),
    setProfile: vi.fn(),
    setAccountType: vi.fn(),
    vehicles: [
      { id: 'v1', plate: 'AA-11-BB', isPrimary: true, isEV: true, isAccessible: false },
      { id: 'v2', plate: 'CC-22-DD', isPrimary: false, isEV: false, isAccessible: true },
    ],
  })),
}));

vi.mock('../../../components/parking/LeafletMap', () => ({
  LeafletMap: ({ lots, onSelect }: { lots?: Array<{ id: string }>; onSelect?: (id: string) => void }) => (
    <div>
      <span>Leaflet Map Mock</span>
      {lots?.map((lot) => <button key={lot.id} onClick={() => onSelect?.(lot.id)}>{`select-${lot.id}`}</button>)}
    </div>
  ),
}));

const parksApiMock = vi.hoisted(() => ({ fetchParkCities: vi.fn(), fetchParksList: vi.fn(), fetchParkDetails: vi.fn(), fetchParkFavoriteStatus: vi.fn(), toggleParkFavorite: vi.fn(), fetchFavoriteParks: vi.fn() }));
vi.mock('../../../services/parksApi', () => parksApiMock);

const apiServiceMock = vi.hoisted(() => ({ profileApi: { get: vi.fn(), uploadPhoto: vi.fn() } }));
vi.mock('../../../services/apiService', () => apiServiceMock);

const baseLot = { id: 'park-1', name: 'Parque Central', address: 'Rua A, Coimbra', localidade: 'Coimbra', availableSpots: 10, totalSpots: 50, hourlyRate: 1.5, dailyMax: 12, monthlyRate: 60, distance: '1 km', walkingTime: '3 min', hasEVCharger: true, hasAccessible: true, latitude: 40.2, longitude: -8.4, evChargers: [{ id: 'ev1', type: 'Type 2', speed: '22kW', speedKW: 22, available: true, price: 0.3 }], accessibleSpots: [{ id: 'ac1', zone: 'A', available: true, monitored: false, distanceToEntrance: 12, hasRampSpace: true, dimensions: '3.5m x 5.0m', sensorStatus: 'online', ledStatus: 'green' }], rating: 0, reviewCount: 0, openingHours: '24h', is24h: true, amenities: ['wc'], zones: [], floors: [{ id: 'f1', name: 'f1', rows: 1, cols: 1, spots: [{ id: 's1', row: 0, col: 0, status: 'free', label: '1' }] }], phone: 'N/D', techFeatures: { hasOCR: false, hasRFID: false, hasIRSensors: false, hasLEDs: false } };

describe('Driver pages', () => {
  it('ParkingListPage loads and shows list', async () => {
    parksApiMock.fetchParkCities.mockResolvedValue(['Coimbra']);
    parksApiMock.fetchParksList.mockResolvedValue({ items: [baseLot], pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    render(<MemoryRouter><ParkingListPage /></MemoryRouter>);
    expect(await screen.findAllByText(/Parque Central/i)).toHaveLength(2);
    expect(screen.getByText(/1 parque encontrado/i)).toBeInTheDocument();
  });

  it('ParkingDetail toggles favorite', async () => {
    parksApiMock.fetchParkDetails.mockResolvedValue(baseLot);
    parksApiMock.fetchParkFavoriteStatus.mockResolvedValue({ parkId: 'park-1', isFavorite: false });
    parksApiMock.toggleParkFavorite.mockResolvedValue({ parkId: 'park-1', isFavorite: true });
    render(<MemoryRouter initialEntries={['/parking/park-1']}><Routes><Route path="/parking/:id" element={<ParkingDetail />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Parque Central/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Adicionar aos favoritos/i));
    await waitFor(() => expect(parksApiMock.toggleParkFavorite).toHaveBeenCalledWith('park-1'));
  });

  it('MapPage selects park and loads detail panel', async () => {
    parksApiMock.fetchParksList.mockResolvedValue({ items: [baseLot], pagination: { page: 1, pageSize: 200, totalItems: 1, totalPages: 1 } });
    parksApiMock.fetchParkDetails.mockResolvedValue(baseLot);
    render(<MemoryRouter><MapPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'select-park-1' }));
    expect(await screen.findByLabelText(/Detalhes de Parque Central/i)).toBeInTheDocument();
  });

  it('FavoritesPage shows empty state', async () => {
    parksApiMock.fetchFavoriteParks.mockResolvedValue([]);
    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
    expect(await screen.findByText(/Sem favoritos ainda/i)).toBeInTheDocument();
  });

  it('ProfilePage renders main section', async () => {
    apiServiceMock.profileApi.get.mockResolvedValue({ role: 'DRIVER', name: 'Ana Silva', email: 'ana@easyspot.pt', photoUrl: null, notificationsEnabled: true, driverType: 'ev', pushNotificationsEnabled: true, emailNotificationsEnabled: true, spending: { totalEuros: 0, sessionCount: 0, avgEuros: 0 }, favoritesCount: 1 });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(await screen.findByText(/Perfil/i)).toBeInTheDocument();
    expect(screen.getByText(/Ana Silva/i)).toBeInTheDocument();
  });
});
