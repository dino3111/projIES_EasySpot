import { useEffect, useState, useMemo } from 'react';
import { useProfile } from '../../context/ProfileContext';
import type { ParkingLot } from '../../data/parkingTypes';
import {
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
import { fetchManagerTariffs, fetchManagerAlerts, updateTariff, updateAlertState, type TariffResponse, type AlertResponse } from '../../services/managerApi';

type PageTab    = 'tarifas' | 'ocorrencias' | 'faturacao';
type IssueFilter = 'todos' | 'aberto' | 'em-progresso' | 'resolvido';
type SevFilter  = 'todos' | 'critica' | 'aviso' | 'info';

const EXPORT_TITLE_BY_TAB: Record<PageTab, string> = {
  tarifas: 'Tarifários',
  ocorrencias: 'Ocorrências',
  faturacao: 'Faturação',
};

function mapTariff(t: TariffResponse): TariffEntry {
  const statusMap: Record<string, 'ativo' | 'revisao' | 'suspenso'> = {
    ACTIVE: 'ativo',
    REVIEW: 'revisao',
    SUSPENDED: 'suspenso',
  };
  return {
    parqueId: t.parkId,
    parqueNome: t.parkName,
    cidade: t.city,
    tarifaHora: t.pricePerHour,
    maxDiario: t.maxDaily,
    mensalidade: t.monthlyPrice,
    tarifaEV: t.pricePerKwh,
    temAcessivel: true,
    ultimaAtualizacao: new Date().toISOString().split('T')[0],
    estado: statusMap[t.status] || 'revisao',
  };
}

function mapAlert(a: AlertResponse): IssueReport {
  const stateMap: Record<string, 'aberto' | 'em-progresso' | 'resolvido'> = {
    OPEN: 'aberto',
    IN_PROGRESS: 'em-progresso',
    RESOLVED: 'resolvido',
  };
  const severityMap: Record<string, 'critica' | 'aviso' | 'info'> = {
    CRITICAL: 'critica',
    WARNING: 'aviso',
    INFO: 'info',
  };
  return {
    id: a.id,
    tipo: a.type.toLowerCase() as any,
    parque: a.park,
    zona: a.zone,
    sensorId: a.sensorId,
    matricula: a.plate,
    descricao: a.description,
    severidade: severityMap[a.severity] || 'info',
    estado: stateMap[a.state] || 'aberto',
    criadoEm: a.createdAt,
    atribuidoA: a.attributedTo,
    notes: a.notes,
  };
}


export function TariffsIncidentsPage() {
  const { managerParks } = useProfile();
  const [tab, setTab]               = useState<PageTab>('tarifas');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('todos');
  const [sevFilter, setSevFilter]   = useState<SevFilter>('todos');
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [editTariff, setEditTariff] = useState<TariffEntry | null>(null);
  const [parkSearch, setParkSearch] = useState('');
  const [parks, setParks] = useState<ParkingLot[]>([]);
  const [tariffs, setTariffs] = useState<TariffEntry[]>([]);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAllParksSummary(),
      fetchManagerTariffs(),
      fetchManagerAlerts()
    ]).then(([parksData, tariffsData, alertsData]) => {
      setParks(parksData);
      setTariffs(tariffsData.map(mapTariff));
      setIssues(alertsData.map(mapAlert));
    }).catch(err => {
      console.error('Error fetching manager data:', err);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveTariff = async (updated: Partial<TariffEntry>) => {
    await updateTariff(updated);
    const tariffsData = await fetchManagerTariffs();
    setTariffs(tariffsData.map(mapTariff));
  };

  const handleUpdateIssueState = async (alertId: string, newState: string) => {
    await updateAlertState(alertId, newState);
    const alertsData = await fetchManagerAlerts();
    setIssues(alertsData.map(mapAlert));
  };

  const gestorTariffs       = tariffs;
  const gestorIssues        = issues;
  const gestorBillingRecords = mockBillingRecords.filter(b => gestorTariffs.some(t => t.parqueNome === b.parqueNome));

  const filteredIssues = useMemo(() => {
    return gestorIssues.filter((i) => {
      const estadoOk = issueFilter === 'todos' || i.estado === issueFilter;
      const sevOk    = sevFilter   === 'todos' || i.severidade === sevFilter;
      return estadoOk && sevOk;
    });
  }, [gestorIssues, issueFilter, sevFilter]);

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

  const openIssuesCount = issues.filter(i => i.estado === 'aberto').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <i className="fas fa-circle-notch fa-spin text-primary text-3xl"></i>
      </div>
    );
  }

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
        <TabBtn active={tab === 'ocorrencias'} onClick={() => setTab('ocorrencias')} icon="fa-triangle-exclamation" label="Ocorrências" badge={openIssuesCount} />
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
      {editTariff    && <TariffModal tariff={editTariff}   onClose={() => setEditTariff(null)} onSave={handleSaveTariff} />}
    </div>
  );
}
