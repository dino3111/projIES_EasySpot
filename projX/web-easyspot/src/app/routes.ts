import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout/Layout';
import { WelcomePage } from './pages/condutor/welcome/WelcomePage';
import { ListaPage } from './pages/condutor/ListaPage';
import { MapaPage } from './pages/condutor/MapaPage';
import { FavoritosPage } from './pages/condutor/FavoritosPage';
import { PerfilPage } from './pages/condutor/PerfilPage';
import { AcessibilidadePage } from './pages/condutor/AcessibilidadePage';
import { ParqueDetalhe } from './pages/condutor/parque/ParqueDetalhe';
import { VeiculosPage } from './pages/condutor/veiculos/VeiculosPage';
import { CustosPage } from './pages/condutor/custos/CustosPage';
import { ReservaPage } from './pages/condutor/reserva/ReservaPage';
import { ReportarPage } from './pages/condutor/reportar/ReportarPage';
import { DashboardGestorPage } from './pages/gestor/DashboardGestorPage';
import { TarifasOcorrenciasPage } from './pages/gestor/TarifasOcorrenciasPage';
import { DashboardTecnicoPage } from './pages/tecnico/DashboardTecnicoPage';
import { ManutencaoPage } from './pages/tecnico/ManutencaoPage';
import { TechinoMapaPage } from './pages/tecnico/TechinoMapaPage';

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
      // Rotas do Técnico
      { path: 'tecnico/dashboard', Component: DashboardTecnicoPage },
      { path: 'tecnico/mapa', Component: TechinoMapaPage },
      { path: 'tecnico/manutencao', Component: ManutencaoPage },
    ],
  },
]);