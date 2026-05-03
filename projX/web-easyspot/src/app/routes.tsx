import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout/Layout';
import { WelcomePage } from './pages/driver/welcome/WelcomePage';
import { CallbackPage } from './pages/CallbackPage';
import { ParkingListPage } from './pages/driver/ParkingListPage';
import { MapPage } from './pages/driver/MapPage';
import { FavoritesPage } from './pages/driver/FavoritesPage';
import { ProfilePage } from './pages/driver/ProfilePage';
import { AccessibilityPage } from './pages/driver/AccessibilityPage';
import { ParkingDetail } from './pages/driver/parking/ParkingDetail';
import { VehiclesPage } from './pages/driver/vehicles/VehiclesPage';
import { CostsPage } from './pages/driver/costs/CostsPage';
import { ReservationPage } from './pages/driver/reservation/ReservationPage';
import { ReportPage } from './pages/driver/report/ReportPage';
import { DashboardManagerPage } from './pages/manager/DashboardManagerPage';
import { TariffsIncidentsPage } from './pages/manager/TariffsIncidentsPage';
import { DashboardTechnicianPage } from './pages/technician/DashboardTechnicianPage';
import { MaintenancePage } from './pages/technician/MaintenancePage';
import { TechMapPage } from './pages/technician/TechMapPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/welcome',
    Component: WelcomePage,
  },
  {
    path: '/callback',
    Component: CallbackPage,
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, Component: ParkingListPage },
      { path: 'parking/:id', Component: ParkingDetail },
      { path: 'map', Component: MapPage },
      { path: 'favorites', Component: FavoritesPage },
      { path: 'profile', Component: ProfilePage },
      { path: 'vehicles', Component: VehiclesPage },
      { path: 'costs', Component: CostsPage },
      { path: 'reservation', Component: ReservationPage },
      { path: 'report', Component: ReportPage },
      { path: 'accessibility', Component: AccessibilityPage },
      {
        path: 'manager/dashboard',
        element: <ProtectedRoute allowedRoles={['MANAGER']}><DashboardManagerPage /></ProtectedRoute>,
      },
      {
        path: 'manager/tariffs-incidents',
        element: <ProtectedRoute allowedRoles={['MANAGER']}><TariffsIncidentsPage /></ProtectedRoute>,
      },
      {
        path: 'technician/dashboard',
        element: <ProtectedRoute allowedRoles={['TECHNICAL']}><DashboardTechnicianPage /></ProtectedRoute>,
      },
      {
        path: 'technician/map',
        element: <ProtectedRoute allowedRoles={['TECHNICAL']}><TechMapPage /></ProtectedRoute>,
      },
      {
        path: 'technician/maintenance',
        element: <ProtectedRoute allowedRoles={['TECHNICAL']}><MaintenancePage /></ProtectedRoute>,
      },
    ],
  },
]);
