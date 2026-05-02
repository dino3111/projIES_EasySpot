import { useSearchParams } from 'react-router';
import { ExpensesTab } from './ExpensesTab';
import { PlanningTab } from './PlanningTab';

type Tab = 'gastos' | 'planeamento';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'gastos',      icon: 'fa-receipt',    label: 'Os Meus Gastos' },
  { id: 'planeamento', icon: 'fa-calculator', label: 'Planeamento'    },
];

export function CostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = tabParam === 'planeamento' ? 'planeamento' : 'gastos';

  function setTab(t: Tab) {
    setSearchParams(t === 'gastos' ? {} : { tab: t });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h1 className="text-foreground font-extrabold" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>Custos</h1>
        <p className="text-muted-foreground mt-1 text-sm">Histórico de gastos e comparador de tarifas</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === t.id ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className={`fas ${t.icon}`} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'gastos'      && <ExpensesTab />}
      {activeTab === 'planeamento' && <PlanningTab />}
    </div>
  );
}
