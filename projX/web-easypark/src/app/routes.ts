import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { ListaPage } from './pages/ListaPage';
import { ParqueDetalhe } from './pages/ParqueDetalhe';
import { MapaPage } from './pages/MapaPage';
import { FavoritosPage } from './pages/FavoritosPage';
import { PerfilPage } from './pages/PerfilPage';
import { CustosPage } from './pages/CustosPage';
import { DashboardGestorPage } from './pages/gestor/DashboardGestorPage';
import { TarifasOcorrenciasPage } from './pages/gestor/TarifasOcorrenciasPage';
import { ReservaPage } from './pages/ReservaPage';
import { ReportarPage } from './pages/ReportarPage';
import { AcessibilidadePage } from './pages/AcessibilidadePage';
import { WelcomePage } from './pages/WelcomePage';
import { VeiculosPage } from './pages/VeiculosPage';

export const router = createBrowserRouter([
  // Página de boas-vindas — sem Layout (sem sidebar/header/bottomnav)
  {
    path: '/welcome',
    Component: WelcomePage,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: ListaPage },
      { path: 'parque/:id', Component: ParqueDetalhe },
      { path: 'mapa', Component: MapaPage },
      { path: 'favoritos', Component: FavoritosPage },
      { path: 'perfil', Component: PerfilPage },
      { path: 'veiculos', Component: VeiculosPage },
      { path: 'custos', Component: CustosPage },
      { path: 'reserva', Component: ReservaPage },
      { path: 'reportar', Component: ReportarPage },
      { path: 'acessibilidade', Component: AcessibilidadePage },
      // Rotas do Gestor
      { path: 'gestor/dashboard', Component: DashboardGestorPage },
      { path: 'gestor/tarifas-ocorrencias', Component: TarifasOcorrenciasPage },
    ],
  },
]);