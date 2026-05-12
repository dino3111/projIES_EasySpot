import { useState, useEffect } from 'react';
import { fetchParksList } from '../../services/parksApi';
import {
  fetchParkAssignments,
  type TechnicianSummary,
  type ParkAssignment,
} from '../../services/managerApi';
import type { ParkingLot } from '../data/parkingTypes';
import { CreateParkModal } from './components/CreateParkModal';
import { AssignTechnicianModal } from './components/AssignTechnicianModal';

export function ManagerParksPage() {
  const [parks, setParks] = useState<ParkingLot[]>([]);
  const [assignments, setAssignments] = useState<ParkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [assignPark, setAssignPark] = useState<{ id: string; name: string; technicians: TechnicianSummary[] } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchParksList({ pageSize: 100 }),
      fetchParkAssignments().catch(() => []),
    ])
      .then(([parksData, assignmentsData]) => {
        setParks(parksData.items);
        setAssignments(assignmentsData);
      })
      .catch(() => setParks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

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

function ParkCard({
  park,
  technicians,
  onAssign,
}: {
  readonly park: ParkingLot;
  readonly technicians: TechnicianSummary[];
  readonly onAssign: () => void;
}) {
  const occPct = park.totalSpots > 0
    ? Math.round(((park.totalSpots - park.availableSpots) / park.totalSpots) * 100)
    : 0;
  const occColor = occPct >= 90 ? '#d4183d' : occPct >= 70 ? '#f59e0b' : '#22c55e';

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground font-semibold truncate" style={{ fontSize: '0.9rem' }}>
            {park.name}
          </p>
          <p className="text-muted-foreground truncate" style={{ fontSize: '0.75rem' }}>
            <i className="fas fa-location-dot mr-1" aria-hidden="true" />
            {park.localidade}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ fontSize: '0.68rem', fontWeight: 700, background: `${occColor}20`, color: occColor }}
        >
          {occPct}%
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat icon="fa-car" label="Lugares" value={String(park.totalSpots)} />
        <Stat icon="fa-door-open" label="Livres" value={String(park.availableSpots)} />
        <Stat icon="fa-clock" label="Horário" value={park.is24h ? '24h' : (park.openingHours || 'N/D')} />
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

      <div className="flex gap-1.5">
        {park.hasEVCharger && (
          <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-600" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
            EV
          </span>
        )}
        {park.hasAccessible && (
          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
            Acessível
          </span>
        )}
      </div>
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
