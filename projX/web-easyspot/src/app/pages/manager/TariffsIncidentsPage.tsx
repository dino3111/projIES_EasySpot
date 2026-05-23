import { useCallback, useEffect, useRef, useState } from 'react';
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

const TARIFF_PAGE_SIZE = 10;
const INCIDENT_PAGE_SIZE = 10;

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
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [editTariff, setEditTariff] = useState<TariffEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Tariff state
  const [tariffs, setTariffs] = useState<TariffEntry[]>([]);
  const [tariffPage, setTariffPage] = useState(0);
  const [tariffDistrict, setTariffDistrict] = useState('');
  const [tariffStatus, setTariffStatus] = useState<'' | 'ACTIVE' | 'INACTIVE'>('');
  const [tariffTotalPages, setTariffTotalPages] = useState(1);
  const [tariffTotalElements, setTariffTotalElements] = useState(0);

  // Incidents state
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('todos');
  const [sevFilter, setSevFilter]   = useState<SevFilter>('todos');
  const [incidentPage, setIncidentPage] = useState(0);
  const [incidentTotalPages, setIncidentTotalPages] = useState(1);
  const [incidentTotalElements, setIncidentTotalElements] = useState(0);
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);

  // Billing state
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [billingPage, setBillingPage] = useState(0);
  const [billingTotalPages, setBillingTotalPages] = useState(1);
  const [billingTotalElements, setBillingTotalElements] = useState(0);

  const isInitialMount = useRef(true);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchManagerTariffs({ page: 0, size: TARIFF_PAGE_SIZE }),
      fetchManagerAlerts({ page: 0, size: INCIDENT_PAGE_SIZE }),
      fetchManagerBilling(),
      fetchManagerAlerts({ page: 0, size: 1, state: 'aberto' }),
    ]).then(([tariffsData, alertsData, billingData, openAlertsData]) => {
      setTariffs(tariffsData.content.map(mapTariff));
      setTariffTotalPages(tariffsData.totalPages);
      setTariffTotalElements(tariffsData.totalElements);
      setIssues(alertsData.content.map(mapAlert));
      setIncidentTotalPages(alertsData.totalPages);
      setIncidentTotalElements(alertsData.totalElements);
      setBillingRecords(billingData.content.map(mapBilling));
      setBillingTotalPages(billingData.totalPages);
      setBillingTotalElements(billingData.totalElements);
      setOpenIncidentsCount(openAlertsData.totalElements);
    }).catch(err => {
      console.error('Error fetching manager data:', err);
    }).finally(() => {
      setLoading(false);
      isInitialMount.current = false;
    });
  }, []);

  // Re-fetch tariffs when page/district/status changes
  useEffect(() => {
    if (isInitialMount.current) return;
    fetchManagerTariffs({
      page: tariffPage,
      size: TARIFF_PAGE_SIZE,
      city: tariffDistrict || undefined,
      status: tariffStatus || undefined,
    }).then(data => {
      setTariffs(data.content.map(mapTariff));
      setTariffTotalPages(data.totalPages);
      setTariffTotalElements(data.totalElements);
    }).catch(err => console.error('Error fetching tariffs:', err));
  }, [tariffPage, tariffDistrict, tariffStatus]);

  // Re-fetch incidents when page/filter changes
  useEffect(() => {
    if (isInitialMount.current) return;
    fetchManagerAlerts({
      page: incidentPage,
      size: INCIDENT_PAGE_SIZE,
      state: issueFilter !== 'todos' ? issueFilter : undefined,
      severity: sevFilter !== 'todos' ? sevFilter : undefined,
    }).then(data => {
      setIssues(data.content.map(mapAlert));
      setIncidentTotalPages(data.totalPages);
      setIncidentTotalElements(data.totalElements);
    }).catch(err => console.error('Error fetching incidents:', err));
  }, [incidentPage, issueFilter, sevFilter]);

  // Re-fetch billing when page changes
  useEffect(() => {
    if (isInitialMount.current) return;
    fetchManagerBilling(undefined, 2, billingPage).then(data => {
      setBillingRecords(data.content.map(mapBilling));
      setBillingTotalPages(data.totalPages);
      setBillingTotalElements(data.totalElements);
    }).catch(err => console.error('Error fetching billing:', err));
  }, [billingPage]);

  const handleTariffPageChange = useCallback((p: number) => setTariffPage(p), []);
  const handleTariffDistrictChange = useCallback((d: string) => {
    setTariffPage(0);
    setTariffDistrict(d);
  }, []);
  const handleTariffStatusChange = useCallback((s: '' | 'ACTIVE' | 'INACTIVE') => {
    setTariffPage(0);
    setTariffStatus(s);
  }, []);

  const handleIssueFilterChange = useCallback((f: IssueFilter) => {
    setIncidentPage(0);
    setIssueFilter(f);
  }, []);
  const handleSevFilterChange = useCallback((f: SevFilter) => {
    setIncidentPage(0);
    setSevFilter(f);
  }, []);
  const handleIncidentPageChange = useCallback((p: number) => setIncidentPage(p), []);
  const handleBillingPageChange  = useCallback((p: number) => setBillingPage(p), []);

  const handleSaveTariff = async (updated: Partial<TariffEntry>) => {
    await updateTariff(updated);
    const data = await fetchManagerTariffs({
      page: tariffPage,
      size: TARIFF_PAGE_SIZE,
      city: tariffDistrict || undefined,
      status: tariffStatus || undefined,
    });
    setTariffs(data.content.map(mapTariff));
    setTariffTotalPages(data.totalPages);
    setTariffTotalElements(data.totalElements);
  };

  const handleExport = async () => {
    let data: unknown;
    let filename: string;
    const dateStr = new Date().toISOString().split('T')[0];

    if (tab === 'ocorrencias') {
      const all = await fetchManagerAlerts({
        page: 0, size: incidentTotalElements || 500,
        state: issueFilter !== 'todos' ? issueFilter : undefined,
        severity: sevFilter !== 'todos' ? sevFilter : undefined,
      });
      data = all.content.map(mapAlert);
      filename = `ocorrencias-${dateStr}.json`;
    } else if (tab === 'tarifas') {
      const all = await fetchManagerTariffs({
        page: 0, size: tariffTotalElements || 500,
        city: tariffDistrict || undefined,
        status: tariffStatus || undefined,
      });
      data = all.content.map(mapTariff);
      filename = `tarifas-${dateStr}.json`;
    } else {
      data = billingRecords;
      filename = `faturacao-${dateStr}.json`;
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
        <TabBtn active={tab === 'ocorrencias'} onClick={() => setTab('ocorrencias')} icon="fa-triangle-exclamation" label="Ocorrências" badge={openIncidentsCount} />
        <TabBtn
          active={tab === 'faturacao'}
          onClick={() => setTab('faturacao')}
          icon="fa-receipt"
          label="Faturação"
        />
      </div>

      {tab === 'tarifas' && (
        <TariffsTab
          onEdit={setEditTariff}
          tariffs={tariffs}
          page={tariffPage}
          totalPages={tariffTotalPages}
          totalElements={tariffTotalElements}
          district={tariffDistrict}
          statusFilter={tariffStatus}
          onPageChange={handleTariffPageChange}
          onDistrictChange={handleTariffDistrictChange}
          onStatusChange={handleTariffStatusChange}
        />
      )}
      {tab === 'ocorrencias' && (
        <IncidentsTab
          issues={issues}
          issueFilter={issueFilter}
          setIssueFilter={handleIssueFilterChange}
          sevFilter={sevFilter}
          setSevFilter={handleSevFilterChange}
          onSelect={setSelectedIssue}
          page={incidentPage}
          totalPages={incidentTotalPages}
          totalElements={incidentTotalElements}
          onPageChange={handleIncidentPageChange}
        />
      )}
      {tab === 'faturacao' && (
        <BillingTab
          billingRecords={billingRecords}
          page={billingPage}
          totalPages={billingTotalPages}
          totalElements={billingTotalElements}
          onPageChange={handleBillingPageChange}
        />
      )}

      {selectedIssue && <IssueModal  issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
      {editTariff    && <TariffModal tariff={editTariff}   onClose={() => setEditTariff(null)} onSave={handleSaveTariff} />}
    </div>
  );
}
