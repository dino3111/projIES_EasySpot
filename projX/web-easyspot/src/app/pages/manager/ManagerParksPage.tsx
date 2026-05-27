import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchManagerParks,
  fetchParkAssignments,
  updateParkStatus,
  type TechnicianSummary,
  type ParkAssignment,
  type ManagerParkSummary,
  type ParkOperationalStatus,
} from '../../services/managerApi';
import { CreateParkModal } from './components/CreateParkModal';
import { AssignTechnicianModal } from './components/AssignTechnicianModal';
import { useOptionalWs } from '../../context/WsContext';
import { useOptionalAuth } from '../../context/AuthContext';

const managerRealtimeFallbackFromEnv = Number(import.meta.env.VITE_MANAGER_REALTIME_FALLBACK_MS ?? 60000);
const MANAGER_REALTIME_FALLBACK_MS = Number.isFinite(managerRealtimeFallbackFromEnv) && managerRealtimeFallbackFromEnv >= 10000
  ? managerRealtimeFallbackFromEnv
  : 60000;

export function ManagerParksPage() {
  const { client, status } = useOptionalWs();
  const auth = useOptionalAuth();
  const user = auth?.user;
  const [parks, setParks] = useState<ManagerParkSummary[]>([]);
  const [assignments, setAssignments] = useState<ParkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [assignPark, setAssignPark] = useState<{ id: string; name: string; technicians: TechnicianSummary[] } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  const loadData = useCallback((background = false) => {
    if (!background) setLoading(true);
    Promise.all([
      fetchManagerParks({ background }),
      fetchParkAssignments({ background }).catch(() => []),
    ])
      .then(([parksData, assignmentsData]) => {
        setParks(parksData);
        setAssignments(assignmentsData);
      })
      .catch(() => {
        if (!background) setParks([]);
      })
      .finally(() => {
        if (!background) setLoading(false);
      });
  }, []);

  const handleToggleStatus = async (parkId: string, current: ParkOperationalStatus) => {
    const next: ParkOperationalStatus = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setTogglingStatus(parkId);
    try {
      const updated = await updateParkStatus(parkId, next);
      setParks((prev) => prev.map((p) => (p.id === parkId ? { ...p, status: updated.status } : p)));
    } catch {
      // leave state unchanged; user can retry
    } finally {
      setTogglingStatus(null);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      loadData(true);
    }, MANAGER_REALTIME_FALLBACK_MS);
    return () => globalThis.clearInterval(intervalId);
  }, [loadData]);

  useEffect(() => {
    if (status !== 'connected' || !client || !user?.sub) return;
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current != null) return;
      refreshTimeoutRef.current = globalThis.setTimeout(() => {
        refreshTimeoutRef.current = null;
        loadData(true);
      }, 250);
    };
    const subscriptions = [
      client.subscribe(`/topic/alerts/${user.sub}`, scheduleRefresh),
      client.subscribe('/topic/occupancy/parks', scheduleRefresh),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      if (refreshTimeoutRef.current != null) {
        globalThis.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [client, status, user?.sub, loadData]);

  const getTechnicians = (parkId: string): TechnicianSummary[] =>
    assignments.find((a) => a.parkId === parkId)?.technicians ?? [];

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
            Parques
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
            Gestão de parques de estacionamento
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity"
          style={{ fontSize: '0.85rem', fontWeight: 700 }}
        >
          <i className="fas fa-plus" aria-hidden="true" />
          Novo Parque
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <i className="fas fa-circle-notch fa-spin text-primary text-3xl" role="status" aria-label="A carregar" />
        </div>
      ) : parks.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-64 gap-3 text-muted-foreground">
          <i className="fas fa-parking" style={{ fontSize: '2.5rem' }} aria-hidden="true" />
          <p style={{ fontSize: '0.9rem' }}>Nenhum parque registado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parks.map((park) => (
            <ParkCard
              key={park.id}
              park={park}
              technicians={getTechnicians(park.id)}
              onAssign={() =>
                setAssignPark({ id: park.id, name: park.name, technicians: getTechnicians(park.id) })
              }
              onToggleStatus={() => handleToggleStatus(park.id, park.status)}
              togglingStatus={togglingStatus === park.id}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateParkModal onClose={() => setShowCreate(false)} onCreated={loadData} />
      )}

      {assignPark && (
        <AssignTechnicianModal
          parkId={assignPark.id}
          parkName={assignPark.name}
          currentTechnicians={assignPark.technicians}
          onClose={() => setAssignPark(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

const STATUS_CONFIG: Record<ParkOperationalStatus, { label: string; color: string; icon: string; nextLabel: string }> = {
  ACTIVE: { label: 'Ativo', color: '#22c55e', icon: 'fa-circle-check', nextLabel: 'Suspender Parque' },
  SUSPENDED: { label: 'Suspenso', color: '#ef4444', icon: 'fa-ban', nextLabel: 'Reativar Parque' },
};

function ParkCard({
  park,
  technicians,
  onAssign,
  onToggleStatus,
  togglingStatus,
}: {
  readonly park: ManagerParkSummary;
  readonly technicians: TechnicianSummary[];
  readonly onAssign: () => void;
  readonly onToggleStatus: () => void;
  readonly togglingStatus: boolean;
}) {
  const statusCfg = STATUS_CONFIG[park.status] ?? STATUS_CONFIG.ACTIVE;

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 space-y-3"
      style={park.status === 'SUSPENDED' ? { borderColor: '#ef4444', borderWidth: '1.5px' } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground font-semibold truncate" style={{ fontSize: '0.9rem' }}>
            {park.name}
          </p>
          <p className="text-muted-foreground truncate" style={{ fontSize: '0.75rem' }}>
            <i className="fas fa-location-dot mr-1" aria-hidden="true" />
            {park.city}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1"
          style={{ fontSize: '0.68rem', fontWeight: 700, background: `${statusCfg.color}20`, color: statusCfg.color }}
          aria-label={`Estado: ${statusCfg.label}`}
        >
          <i className={`fas ${statusCfg.icon}`} style={{ fontSize: '0.6rem' }} aria-hidden="true" />
          {statusCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <Stat icon="fa-car" label="Lugares" value={String(park.totalSpaces)} />
        <Stat icon="fa-clock" label="Horário" value={park.openingHours || 'N/D'} />
      </div>

      {/* Técnicos atribuídos */}
      <div className="border-t border-border pt-2.5">
        {technicians.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {technicians.map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                style={{ fontSize: '0.68rem', fontWeight: 600 }}
              >
                <i className="fas fa-user-gear" style={{ fontSize: '0.6rem' }} aria-hidden="true" />
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
            <i className="fas fa-circle-exclamation mr-1 text-amber-500" aria-hidden="true" />
            Sem técnico atribuído
          </p>
        )}
        <button
          type="button"
          onClick={onAssign}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-border hover:bg-muted transition-colors text-foreground"
          style={{ fontSize: '0.75rem', fontWeight: 600 }}
        >
          <i className="fas fa-user-gear text-primary" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
          {technicians.length > 0 ? 'Gerir Técnicos' : 'Atribuir Técnico'}
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleStatus}
        disabled={togglingStatus}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border transition-colors disabled:opacity-50"
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          borderColor: statusCfg.color,
          color: statusCfg.color,
          background: `${statusCfg.color}10`,
        }}
        aria-label={statusCfg.nextLabel}
      >
        {togglingStatus
          ? <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
          : <i className={`fas ${park.status === 'ACTIVE' ? 'fa-ban' : 'fa-play-circle'}`} style={{ fontSize: '0.7rem' }} aria-hidden="true" />
        }
        {statusCfg.nextLabel}
      </button>
    </div>
  );
}

function Stat({ icon, label, value }: { readonly icon: string; readonly label: string; readonly value: string }) {
  return (
    <div className="bg-muted/40 rounded-xl py-2 px-1">
      <i className={`fas ${icon} text-primary mb-1`} style={{ fontSize: '0.75rem' }} aria-hidden="true" />
      <p className="text-foreground" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{value}</p>
      <p className="text-muted-foreground" style={{ fontSize: '0.62rem' }}>{label}</p>
    </div>
  );
}
