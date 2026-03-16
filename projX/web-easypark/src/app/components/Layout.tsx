import { Outlet } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">
      {/* Header fixo no topo */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar para desktop */}
        <Sidebar />

        {/* Conteúdo principal */}
        <main
          className="flex-1 overflow-y-auto pb-20 md:pb-6"
          id="main-content"
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav apenas no mobile */}
      <BottomNav />
    </div>
  );
}