import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { ListaPage } from './pages/ListaPage';
import { ParqueDetalhe } from './pages/ParqueDetalhe';
import { MapaPage } from './pages/MapaPage';
import { FavoritosPage } from './pages/FavoritosPage';
import { PerfilPage } from './pages/PerfilPage';
import { GastosPage } from './pages/GastosPage';
import { DashboardGestorPage } from './pages/gestor/DashboardGestorPage';
import { TarifasOcorrenciasPage } from './pages/gestor/TarifasOcorrenciasPage';
import { DashboardTecnicoPage } from './pages/tecnico/DashboardTecnicoPage';
import { ManutencaoPage } from './pages/tecnico/ManutencaoPage';
import { TechinoMapaPage } from './pages/tecnico/TechinoMapaPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: ListaPage },
      { path: 'parque/:id', Component: ParqueDetalhe },
      { path: 'mapa', Component: MapaPage },
      { path: 'favoritos', Component: FavoritosPage },
      { path: 'perfil', Component: PerfilPage },
      { path: 'gastos', Component: GastosPage },
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