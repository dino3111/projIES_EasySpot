import { useState } from 'react';
import { computeTechKPIs, type SensorDevice } from '../../../data/technicianData';
import { STATUS_COLOR, STATUS_LABEL, type StatusFil } from './maintenanceTypes';
import { EmptyState, StatBadge, TechMapLegend } from './shared';

type SensorsTabProps = Readonly<{
  sensors: SensorDevice[];
  statusFil: StatusFil;
  setStatusFil: (f: StatusFil) => void;
  onSelect: (s: SensorDevice) => void;
  kpis: ReturnType<typeof computeTechKPIs>;
}>;

type ParkSensorMapViewProps = Readonly<{
  parkId: string;
  allSensors: SensorDevice[];
  onBack: () => void;
  onSelectSensor: (s: SensorDevice) => void;
}>;

const getHealthColor = (healthPct: number) => {
  if (healthPct > 90) return '#22c55e';
  if (healthPct > 70) return '#f59e0b';
  return '#d4183d';
};


export function SensorsTab({
  sensors,
  statusFil,
  setStatusFil,
  onSelect,
  kpis,
}: SensorsTabProps) {
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const [cidadeFilter, setCidadeFilter] = useState('todas');

  const allParkIds = Array.from(new Set(sensors.map(s => s.parqueId)));
  const uniqueCities = Array.from(new Set(sensors.map(s => s.cidade).filter(c => c.trim() !== ''))).sort((a: string, b: string) => a.localeCompare(b, 'pt-PT'));

  const statusFilters: { value: StatusFil; label: string; count: number }[] = [
    { value: 'todos',       label: 'Todos',       count: sensors.length },
    { value: 'operacional', label: 'Operacional', count: kpis.operacionais },
    { value: 'falha',       label: 'Falha',       count: kpis.emFalha },
    { value: 'offline',     label: 'Offline',     count: kpis.offline },
    { value: 'manutencao',  label: 'Manutenção',  count: kpis.emManutencao },
  ];

  if (selectedParkId) {
    return (
      <ParkSensorMapView
        parkId={selectedParkId}
        allSensors={sensors.filter(s => s.parqueId === selectedParkId)}

        onBack={() => setSelectedParkId(null)}
        onSelectSensor={onSelect}
      />
    );
  }

  const visibleParkIds = allParkIds.filter(parkId => {
    const parkSensors = sensors.filter(s => s.parqueId === parkId);
    const park = parkSensors[0];
    if (cidadeFilter !== 'todas' && park && park.cidade !== cidadeFilter) return false;
    if (statusFil === 'todos') return true;
    if (statusFil === 'operacional') return parkSensors.length > 0 && parkSensors.every(s => s.status === 'operacional');
    return parkSensors.some(s => s.status === statusFil);
  });

  return (
    <div className="space-y-4">
      {uniqueCities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl overflow-hidden border border-border flex-wrap">
            <button
              onClick={() => setCidadeFilter('todas')}
              className={`px-3 py-1.5 transition-colors ${cidadeFilter === 'todas' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              <i className="fas fa-map-pin mr-1" aria-hidden="true"></i>
              {' '}
              Todas as Cidades
            </button>
            {uniqueCities.map(city => (
              <button
                key={city}
                onClick={() => setCidadeFilter(city)}
                className={`px-3 py-1.5 transition-colors ${cidadeFilter === city ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                style={{ fontSize: '0.75rem', fontWeight: 600 }}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFil(f.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
              statusFil === f.value
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-muted'
            }`}
            style={{ fontSize: '0.78rem', fontWeight: 600 }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
        {visibleParkIds.length === 0 && (
          <div className="col-span-2">
            <EmptyState icon="fa-circle-check" title="Sem parques" desc="Nenhum parque corresponde aos filtros selecionados." />
          </div>
        )}
        {visibleParkIds.map(parkId => {
          const allParkSensors = sensors.filter(s => s.parqueId === parkId);
          const park = allParkSensors[0];
          if (!park) return null;
          const healthPct = allParkSensors.length > 0
            ? Math.round(allParkSensors.filter(s => s.status === 'operacional').length / allParkSensors.length * 100)
            : 100;
          const healthColor = getHealthColor(healthPct);
          const statusByState = {
            operacional: allParkSensors.filter(s => s.status === 'operacional').length,
            falha:       allParkSensors.filter(s => s.status === 'falha').length,
            offline:     allParkSensors.filter(s => s.status === 'offline').length,
            manutencao:  allParkSensors.filter(s => s.status === 'manutencao').length,
          };
          return (
            <button
              key={parkId}
              onClick={() => setSelectedParkId(parkId)}
              className="text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/50 hover:bg-card/85 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-foreground font-bold" style={{ fontSize: '1rem' }}>{park.parqueNome}</h3>
                  <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
                    <i className="fas fa-location-dot mr-1" aria-hidden="true"></i>
                    {park.cidade}
                  </p>
                </div>
                <i className="fas fa-map text-primary" style={{ fontSize: '1.25rem' }} aria-hidden="true"></i>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${healthPct}%`, background: healthColor }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: healthColor }}>{healthPct}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <StatBadge label="OK"         value={statusByState.operacional} color="#22c55e" icon="fa-circle-check" />
                <StatBadge label="Falha"      value={statusByState.falha}       color="#d4183d" icon="fa-circle-xmark" />
                <StatBadge label="Manutenção" value={statusByState.manutencao}  color="#f59e0b" icon="fa-wrench" />
                <StatBadge label="Offline"    value={statusByState.offline}     color="#6b7280" icon="fa-circle-minus" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ParkSensorMapView({
  parkId, allSensors, onBack, onSelectSensor,
}: ParkSensorMapViewProps) {
  const parkName = allSensors[0]?.parqueNome ?? parkId;
  const [localFilter, setLocalFilter] = useState<StatusFil>('todos');
  const [visibleCount, setVisibleCount] = useState(5);

  const statusCounts = {
    operacional: allSensors.filter(s => s.status === 'operacional').length,
    falha:       allSensors.filter(s => s.status === 'falha').length,
    offline:     allSensors.filter(s => s.status === 'offline').length,
    manutencao:  allSensors.filter(s => s.status === 'manutencao').length,
  };

  // Build a label for each sensor from sensorId suffix: "IR-AV1-B07" → "B07"
  const sensorLabel = (s: SensorDevice) => s.lugar ?? s.id.split('-').pop() ?? s.id;

  // Grid: up to 4 columns, rows expand as needed
  const COLS = Math.min(4, allSensors.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
        <div>
          <h2 className="text-foreground font-bold" style={{ fontSize: '1rem' }}>
            <i className="fas fa-map mr-2 text-primary" aria-hidden="true"></i>
            {parkName}
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>Total: {allSensors.length} sensores</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
        >
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
          {' '}
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatBadge label="Operacional" value={statusCounts.operacional} color="#22c55e" icon="fa-circle-check" />
        <StatBadge label="Falha"       value={statusCounts.falha}       color="#d4183d" icon="fa-circle-xmark" />
        <StatBadge label="Manutenção"  value={statusCounts.manutencao}  color="#f59e0b" icon="fa-wrench" />
        <StatBadge label="Offline"     value={statusCounts.offline}     color="#6b7280" icon="fa-circle-minus" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 bg-muted/30 border-b border-border flex flex-wrap items-center gap-3">
          <span className="text-foreground font-bold" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-map-pin mr-1.5 text-primary" aria-hidden="true"></i>
            Disposição dos Lugares
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <TechMapLegend color="#22c55e" label="Operacional" />
            <TechMapLegend color="#d4183d" label="Falha" />
            <TechMapLegend color="#f59e0b" label="Manutenção" />
            <TechMapLegend color="#6b7280" label="Offline" />
          </div>
        </div>
        <div className="p-4 flex justify-center bg-muted/10">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${COLS}, 52px)` }}
          >
            {allSensors.map(sensor => {
              const color = STATUS_COLOR[sensor.status];
              const label = sensorLabel(sensor);
              return (
                <button
                  key={sensor.id}
                  onClick={() => onSelectSensor(sensor)}
                  className="flex flex-col items-center justify-center rounded-xl shadow-sm hover:scale-105 transition-all cursor-pointer"
                  style={{ width: 52, height: 52, background: color }}
                  title={`${label} — ${STATUS_LABEL[sensor.status]}\n${sensor.id}`}
                >
                  <i className="fas fa-microchip text-white" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
                  <span className="text-white font-bold leading-none mt-1" style={{ fontSize: '0.6rem' }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-foreground mb-3 font-bold" style={{ fontSize: '0.875rem' }}>
          <i className="fas fa-list mr-2 text-primary" aria-hidden="true"></i>
          Sensores ({allSensors.filter(s => localFilter === 'todos' || s.status === localFilter).length})
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {([
            { v: 'todos'       as StatusFil, l: `Todos (${allSensors.length})`,                active: 'bg-primary text-white border-primary',        inactive: 'bg-card text-muted-foreground border-border hover:border-primary/50' },
            { v: 'operacional' as StatusFil, l: `Operacional (${statusCounts.operacional})`,   active: 'bg-green-500 text-white border-green-500',     inactive: 'bg-card text-muted-foreground border-border hover:border-green-500/50' },
            { v: 'falha'       as StatusFil, l: `Falha (${statusCounts.falha})`,               active: 'bg-red-500 text-white border-red-500',         inactive: 'bg-card text-muted-foreground border-border hover:border-red-500/50' },
            { v: 'offline'     as StatusFil, l: `Offline (${statusCounts.offline})`,           active: 'bg-gray-500 text-white border-gray-500',       inactive: 'bg-card text-muted-foreground border-border hover:border-gray-500/50' },
            { v: 'manutencao'  as StatusFil, l: `Manutenção (${statusCounts.manutencao})`,     active: 'bg-amber-500 text-white border-amber-500',     inactive: 'bg-card text-muted-foreground border-border hover:border-amber-500/50' },
          ]).map(({ v, l, active, inactive }) => (
            <button
              key={v}
              onClick={() => { setLocalFilter(v); setVisibleCount(5); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${localFilter === v ? active : inactive}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {allSensors
            .filter(s => localFilter === 'todos' || s.status === localFilter)
            .slice(0, visibleCount)
            .map(sensor => {
              const color = STATUS_COLOR[sensor.status];
              return (
                <button
                  key={sensor.id}
                  onClick={() => onSelectSensor(sensor)}
                  className="w-full text-left flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-card/85 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                    <i className="fas fa-microchip" style={{ color, fontSize: '0.9rem' }} aria-hidden="true"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-bold" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{sensor.id}</span>
                      <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                        {sensor.zona}{sensor.lugar ? ` · ${sensor.lugar}` : ''}
                      </span>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                      {sensor.tipo} • FW {sensor.firmware} • Uptime {sensor.uptimePercent}%
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full flex-shrink-0" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${color}20`, color }}>
                    {STATUS_LABEL[sensor.status]}
                  </span>
                </button>
              );
            })}
          {allSensors.filter(s => localFilter === 'todos' || s.status === localFilter).length > visibleCount && (
            <button
              onClick={() => setVisibleCount(prev => prev + 5)}
              className="w-full flex items-center justify-center gap-2 p-3 mt-3 bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors text-primary font-bold"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-plus" aria-hidden="true"></i>
              Mostrar mais ({allSensors.filter(s => localFilter === 'todos' || s.status === localFilter).length - visibleCount} restantes)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
