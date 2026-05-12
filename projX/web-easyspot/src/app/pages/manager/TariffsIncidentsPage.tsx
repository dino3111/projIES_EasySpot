import { useEffect, useState, useMemo } from 'react';
import {
  type IssueReport,
  type BillingRecord,
  type TariffEntry,
} from '../../data/gestorData';
import { TariffsTab } from './components/TariffsTab';
import { IncidentsTab } from './components/IncidentsTab';
import { BillingTab } from './components/BillingTab';
import { IssueModal }   from './components/IssueModal';
import { TariffModal }  from './components/TariffModal';
import { TabBtn }       from './components/shared';
import {
  fetchManagerTariffs,
  fetchManagerAlerts,
  fetchManagerBilling,
  updateTariff,
  type TariffResponse,
  type AlertResponse,
  type BillingSessionResponse,
} from '../../services/managerApi';

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
    INACTIVE: 'suspenso',
  };
  return {
    id: t.id,
    parqueId: t.parkId,
    parqueNome: t.parkName,
    cidade: t.city,
    tarifaHora: t.pricePerHour,
    maxDiario: t.maxDaily,
    mensalidade: t.monthlyPrice,
    tarifaEV: t.pricePerKwh,
    temAcessivel: true,
    ultimaAtualizacao: new Date().toISOString().split('T')[0],
    estado: statusMap[t.status] ?? 'ativo',
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
  const typeMap: Record<string, IssueReport['tipo']> = {
    sensor: 'sensor', client: 'cliente', cliente: 'cliente', system: 'sistema', sistema: 'sistema',
  };
  return {
    id: a.id,
    tipo: typeMap[a.type?.toLowerCase()] ?? 'sistema',
    parque: a.park,
    zona: a.zone,
    sensorId: a.sensorId,
    matricula: a.plate,
    descricao: a.description,
    severidade: severityMap[a.severity.toUpperCase()] || 'info',
    estado: stateMap[a.state.toUpperCase().replace('-', '_')] || 'aberto',
    criadoEm: a.createdAt,
    reportadoPor: a.reportedBy ?? undefined,
    atribuidoA: a.attributedTo,
    notas: a.notes,
    fotoUrl: a.photoUrl ?? undefined,
  };
}

function mapBilling(b: BillingSessionResponse): BillingRecord {
  const durationH = Math.floor(b.durationMinutes / 60);
  const durationM = b.durationMinutes % 60;
  const entryDate = new Date(b.entryTime);
  const dateStr = entryDate.toLocaleString('pt-PT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', '');
  const method: BillingRecord['metodo'] = b.licensePlate ? 'OCR' : 'Manual';
  return {
    id: b.id,
    parqueNome: b.parkName,
    data: dateStr,
    matricula: b.licensePlate ?? '—',
    metodo: method,
    duracao: `${durationH}h ${String(durationM).padStart(2, '0')}m`,
    valorEstacionamento: Number(b.parkingRevenue),
    valorEV: Number(b.evRevenue) > 0 ? Number(b.evRevenue) : undefined,
    total: Number(b.total),
    estado: 'pago',
  };
}


export function TariffsIncidentsPage() {
  const [tab, setTab]               = useState<PageTab>('tarifas');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('todos');
  const [sevFilter, setSevFilter]   = useState<SevFilter>('todos');
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [editTariff, setEditTariff] = useState<TariffEntry | null>(null);
  const [tariffs, setTariffs] = useState<TariffEntry[]>([]);
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchManagerTariffs(),
      fetchManagerAlerts(),
      fetchManagerBilling(),
    ]).then(([tariffsData, alertsData, billingData]) => {
      setTariffs(tariffsData.map(mapTariff));
      setIssues(alertsData.map(mapAlert));
      setBillingRecords(billingData.content.map(mapBilling));
    }).catch(err => {
      console.error('Error fetching manager data:', err);
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveTariff = async (updated: Partial<TariffEntry>) => {
    await updateTariff(updated);
    const tariffsData = await fetchManagerTariffs();
    setTariffs(tariffsData.map(mapTariff));
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const estadoOk = issueFilter === 'todos' || i.estado === issueFilter;
      const sevOk    = sevFilter   === 'todos' || i.severidade === sevFilter;
      return estadoOk && sevOk;
    });
  }, [issues, issueFilter, sevFilter]);

  const handleExport = () => {
    let data: unknown;
    let filename: string;

    if (tab === 'ocorrencias') {
      data = filteredIssues;
      filename = `ocorrencias-${new Date().toISOString().split('T')[0]}.json`;
    } else if (tab === 'tarifas') {
      data = tariffs;
      filename = `tarifas-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      data = billingRecords;
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
        <i className="fas fa-circle-notch fa-spin text-primary text-3xl" role="status" aria-label="A carregar"></i>
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
        <TabBtn
          active={tab === 'faturacao'}
          onClick={() => setTab('faturacao')}
          icon="fa-receipt"
          label="Faturação"
        />
      </div>

      {tab === 'tarifas'     && <TariffsTab    onEdit={setEditTariff}   tariffs={tariffs} />}
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
      {tab === 'faturacao' && <BillingTab billingRecords={billingRecords} />}

      {selectedIssue && <IssueModal  issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
      {editTariff    && <TariffModal tariff={editTariff}   onClose={() => setEditTariff(null)} onSave={handleSaveTariff} />}
    </div>
  );
}
