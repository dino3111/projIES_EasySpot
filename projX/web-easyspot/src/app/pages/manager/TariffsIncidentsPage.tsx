import { useEffect, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import type { ParkingLot } from '../../data/parkingTypes';
import {
  mockTariffs,
  mockIssues,
  mockBillingRecords,
  type IssueReport,
  type TariffEntry,
} from '../../data/gestorData';
import { TariffsTab } from './components/TariffsTab';
import { IncidentsTab } from './components/IncidentsTab';
import { BillingTab } from './components/BillingTab';
import { IssueModal }   from './components/IssueModal';
import { TariffModal }  from './components/TariffModal';
import { TabBtn }       from './components/shared';
import { fetchAllParksSummary } from '../../services/parksCatalog';

type PageTab    = 'tarifas' | 'ocorrencias' | 'faturacao';
type IssueFilter = 'todos' | 'aberto' | 'em-progresso' | 'resolvido';
type SevFilter  = 'todos' | 'critica' | 'aviso' | 'info';

const EXPORT_TITLE_BY_TAB: Record<PageTab, string> = {
  tarifas: 'Tarifários',
  ocorrencias: 'Ocorrências',
  faturacao: 'Faturação',
};

export function TariffsIncidentsPage() {
  const { managerParks } = useProfile();
  const [tab, setTab]               = useState<PageTab>('tarifas');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('todos');
  const [sevFilter, setSevFilter]   = useState<SevFilter>('todos');
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [editTariff, setEditTariff] = useState<TariffEntry | null>(null);
  const [parkSearch, setParkSearch] = useState('');
  const [parks, setParks] = useState<ParkingLot[]>([]);

  useEffect(() => {
    fetchAllParksSummary().then(setParks).catch(() => setParks([]));
  }, []);

  const gestorTariffs       = mockTariffs.filter(t => managerParks.includes(t.parqueId));
  const gestorIssues        = mockIssues.filter(i => gestorTariffs.some(t => t.parqueNome === i.parque));
  const gestorBillingRecords = mockBillingRecords.filter(b => gestorTariffs.some(t => t.parqueNome === b.parqueNome));

  const filteredIssues = gestorIssues.filter((i) => {
    const estadoOk = issueFilter === 'todos' || i.estado === issueFilter;
    const sevOk    = sevFilter   === 'todos' || i.severidade === sevFilter;
    return estadoOk && sevOk;
  });

  const handleExport = () => {
    let data: unknown;
    let filename: string;

    if (tab === 'ocorrencias') {
      data = filteredIssues;
      filename = `ocorrencias-${new Date().toISOString().split('T')[0]}.json`;
    } else if (tab === 'tarifas') {
      data = gestorTariffs;
      filename = `tarifas-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      data = gestorBillingRecords;
      filename = `faturacao-${new Date().toISOString().split('T')[0]}.json`;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-5">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
            Tarifas &amp; Ocorrências
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
            Gestão de tarifários, faturação e registo de problemas
          </p>
        </div>
        <button
          onClick={handleExport}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-foreground"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
          aria-label="Exportar dados"
          title={`Exportar dados de ${EXPORT_TITLE_BY_TAB[tab]}`}
        >
          <i className="fas fa-file-export text-primary" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
          Exportar
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Secções de tarifas e ocorrências"
        className="flex gap-0 bg-muted rounded-xl p-1 w-full sm:w-auto sm:inline-flex"
      >
        <TabBtn active={tab === 'tarifas'}     onClick={() => setTab('tarifas')}     icon="fa-file-invoice-dollar"  label="Tarifários" />
        <TabBtn active={tab === 'ocorrencias'} onClick={() => setTab('ocorrencias')} icon="fa-triangle-exclamation" label="Ocorrências" badge={mockIssues.filter(i => i.estado === 'aberto').length} />
        <TabBtn active={tab === 'faturacao'}   onClick={() => setTab('faturacao')}   icon="fa-receipt"              label="Faturação" />
      </div>

      <div className="rounded-2xl p-4 bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-building text-primary" style={{ fontSize: '0.9rem' }} aria-hidden="true"></i>
          <h3 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>Parques Geridos</h3>
          <span className="ml-auto text-muted-foreground" style={{ fontSize: '0.75rem' }}>({managerParks.length} parques)</span>
        </div>
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-background border border-border">
          <i className="fas fa-search text-muted-foreground" style={{ fontSize: '0.85rem' }}></i>
          <input
            type="text"
            placeholder="Pesquisar parques..."
            value={parkSearch}
            onChange={(e) => setParkSearch(e.target.value)}
            className="flex-1 bg-transparent text-foreground outline-none"
            style={{ fontSize: '0.875rem' }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {parks
            .filter(p => managerParks.includes(p.id))
            .filter(p => p.name.toLowerCase().includes(parkSearch.toLowerCase()))
            .slice(0, 5)
            .map((park) => (
              <div
                key={park.id}
                className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-foreground flex items-center gap-2"
                style={{ fontSize: '0.8rem' }}
              >
                <i className="fas fa-check-circle text-primary" style={{ fontSize: '0.75rem' }}></i>
                <span className="font-medium">{park.name}</span>
              </div>
            ))}
          {managerParks.filter(id =>
            parks.find(p => p.id === id && p.name.toLowerCase().includes(parkSearch.toLowerCase()))
          ).length === 0 && (
            <p className="text-muted-foreground w-full text-center py-2" style={{ fontSize: '0.875rem' }}>
              Nenhum parque encontrado
            </p>
          )}
        </div>
      </div>

      {tab === 'tarifas'     && <TariffsTab    onEdit={setEditTariff}   tariffs={gestorTariffs} />}
      {tab === 'ocorrencias' && (
        <IncidentsTab
          issues={filteredIssues}
          issueFilter={issueFilter}
          setIssueFilter={setIssueFilter}
          sevFilter={sevFilter}
          setSevFilter={setSevFilter}
          onSelect={setSelectedIssue}
        />
      )}
      {tab === 'faturacao'   && <BillingTab  billingRecords={gestorBillingRecords} />}

      {selectedIssue && <IssueModal  issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
      {editTariff    && <TariffModal tariff={editTariff}   onClose={() => setEditTariff(null)} />}
    </div>
  );
}
