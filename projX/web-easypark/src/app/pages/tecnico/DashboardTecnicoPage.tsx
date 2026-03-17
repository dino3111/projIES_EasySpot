import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  mockSensors,
  mockTechKPIs,
  mockUptimeTrend,
  mockMaintenanceOrders,
  computeTechKPIs,
  type SensorDevice,
  type SensorStatus,
} from '../../data/technicianData';

// ─── Cores por status ─────────────────────────────────────────────────────────
const STATUS_COLOR: Record<SensorStatus, string> = {
  operacional: '#22c55e',
  falha:       '#d4183d',
  offline:     '#6b7280',
  manutencao:  '#f59e0b',
};
const STATUS_LABEL: Record<SensorStatus, string> = {
  operacional: 'Operacional',
  falha:       'Falha',
  offline:     'Offline',
  manutencao:  'Manutenção',
};
const STATUS_ICON: Record<SensorStatus, string> = {
  operacional: 'fa-circle-check',
  falha:       'fa-circle-xmark',
  offline:     'fa-circle-minus',
  manutencao:  'fa-wrench',
};
const TIPO_ICON: Record<string, string> = {
  IR:      'fa-microchip',
  RFID:    'fa-wifi',
  OCR:     'fa-camera',
  EV:      'fa-bolt',
  Gateway: 'fa-network-wired',
};

export function DashboardTecnicoPage() {
  const [sensors, setSensors] = useState<SensorDevice[]>(mockSensors);
  const [selectedSensor, setSelectedSensor] = useState<SensorDevice | null>(null);
  const [updateModal, setUpdateModal] = useState<SensorDevice | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const kpis = computeTechKPIs(sensors);

  const handleStatusUpdate = (sensorId: string, newStatus: SensorStatus, notes: string) => {
    setSensors(prev => prev.map(s => {
      if (s.id !== sensorId) return s;
      const newLog = {
        id: `upd-${Date.now()}`,
        timestamp: new Date().toISOString(),
        codigo: 'INFO_STATUS_UPDATED',
        descricao: `Estado atualizado para "${STATUS_LABEL[newStatus]}" pelo técnico.${notes ? ` Notas: ${notes}` : ''}`,
        resolvido: true,
      };
      return { ...s, status: newStatus, historicoErros: [newLog, ...s.historicoErros] };
    }));
    setUpdateModal(null);
    setSelectedSensor(null);
    setToast(`Sensor atualizado para "${STATUS_LABEL[newStatus]}" com sucesso.`);
    setTimeout(() => setToast(null), 4000);
  };

  const pieData: { name: string; value: number; color: string }[] = [
    { name: 'Operacional', value: kpis.operacionais, color: STATUS_COLOR.operacional },
    { name: 'Falha',       value: kpis.emFalha,      color: STATUS_COLOR.falha },
    { name: 'Offline',     value: kpis.offline,       color: STATUS_COLOR.offline },
    { name: 'Manutenção',  value: kpis.emManutencao,  color: STATUS_COLOR.manutencao },
  ].filter(d => d.value > 0);

  const ordensAbertas = mockMaintenanceOrders.filter(o => o.estado !== 'concluida');

  return (
    <div className="px-4 py-5 max-w-screen-xl mx-auto space-y-6">

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-600 text-white shadow-xl"
          style={{ fontSize: '0.85rem', fontWeight: 600 }}
        >
          <i className="fas fa-circle-check" aria-hidden="true"></i>
          {toast}
        </div>
      )}

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className="text-foreground"
            style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}
          >
            Painel Técnico
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
            Segunda-feira, 9 de março de 2026 · Laura Farias
          </p>
        </div>
        <button
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-foreground"
          style={{ fontSize: '0.8rem', fontWeight: 600 }}
          aria-label="Exportar relatório técnico"
        >
          <i className="fas fa-file-export text-primary" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
          Exportar
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="fa-microchip"
          label="Total Sensores"
          value={kpis.totalSensores.toString()}
          subValue={`${kpis.operacionais} operacionais`}
          trend="neutral"
          color="#7357ec"
        />
        <KpiCard
          icon="fa-signal"
          label="Uptime Médio"
          value={`${kpis.uptimeMedio}%`}
          subValue={`${kpis.emFalha + kpis.offline} com problemas`}
          trend={kpis.uptimeMedio >= 97 ? 'up' : 'warn'}
          color="#22c55e"
        />
        <KpiCard
          icon="fa-circle-exclamation"
          label="Falhas Ativas"
          value={(kpis.emFalha + kpis.offline).toString()}
          subValue={`${kpis.emFalha} falha · ${kpis.offline} offline`}
          trend={kpis.emFalha + kpis.offline > 0 ? 'down' : 'neutral'}
          color="#d4183d"
        />
        <KpiCard
          icon="fa-clock-rotate-left"
          label="MTTR"
          value={`${kpis.mttrHoras}h`}
          subValue={`Tx. F.Pos: ${kpis.taxaFalsosPositivos}%`}
          trend={kpis.mttrHoras < 6 ? 'up' : 'warn'}
          color="#f59e0b"
        />
      </div>

      {/* ── Gráficos ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Uptime trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4">
          <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Uptime Global — Últimos 7 Dias
          </h2>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockUptimeTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUptime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[90, 100]} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-foreground)', fontSize: '0.8rem' }}
                  formatter={(v: number) => [`${v}%`, 'Uptime']}
                />
                <Area type="monotone" dataKey="uptime" stroke="#22c55e" strokeWidth={2.5} fill="url(#gradUptime)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de status */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-foreground mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>
            Estado dos Sensores
          </h2>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3}>
                  {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--color-foreground)' }}
                  formatter={(v: number, name: string) => [v, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} aria-hidden="true" />
                <span className="text-foreground flex-1" style={{ fontSize: '0.72rem' }}>{d.name}</span>
                <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{d.value}</span>
                <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.65rem', fontWeight: 700, background: `${d.color}22`, color: d.color }}>
                  {Math.round((d.value / kpis.totalSensores) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ordens urgentes ───────────────────────────────────────────── */}
      {ordensAbertas.filter(o => o.prioridade === 'critica' || o.prioridade === 'alta').length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-triangle-exclamation text-destructive" style={{ fontSize: '1rem' }} aria-hidden="true"></i>
            <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 700 }}>
              Ordens Urgentes
            </h2>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-destructive/15 text-destructive" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              {ordensAbertas.filter(o => o.prioridade === 'critica' || o.prioridade === 'alta').length} pendentes
            </span>
          </div>
          <div className="space-y-2">
            {ordensAbertas
              .filter(o => o.prioridade === 'critica' || o.prioridade === 'alta')
              .map(order => {
                const priColor = order.prioridade === 'critica' ? '#d4183d' : '#f59e0b';
                const sensor = sensors.find(s => s.id === order.sensorId);
                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${priColor}15` }} aria-hidden="true">
                      <i className="fas fa-wrench" style={{ color: priColor, fontSize: '0.8rem' }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{order.titulo}</span>
                        <span
                          className="px-1.5 py-0.5 rounded-full"
                          style={{ fontSize: '0.62rem', fontWeight: 700, background: `${priColor}20`, color: priColor }}
                        >
                          {order.prioridade === 'critica' ? 'Crítica' : 'Alta'}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.75rem' }}>
                        {order.parque} · <span style={{ fontFamily: 'monospace' }}>{order.sensorId}</span>
                        {order.prazo && ` · Prazo: ${new Date(order.prazo).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                    {sensor && (
                      <button
                        onClick={() => setUpdateModal(sensor)}
                        className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        style={{ fontSize: '0.72rem', fontWeight: 600 }}
                        aria-label={`Atualizar estado do sensor ${sensor.id}`}
                      >
                        Atualizar
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Modais ────────────────────────────────────────────────────── */}
      {selectedSensor && (
        <SensorDetailModal
          sensor={selectedSensor}
          onClose={() => setSelectedSensor(null)}
          onUpdate={() => { setUpdateModal(selectedSensor); }}
        />
      )}
      {updateModal && (
        <StatusUpdateModal
          sensor={updateModal}
          onClose={() => setUpdateModal(null)}
          onConfirm={handleStatusUpdate}
        />
      )}
    </div>
  );
}

// ─── SensorRow ────────────────────────────────────────────────────────────────
function SensorRow({ sensor, isLast, onClick }: { sensor: SensorDevice; isLast: boolean; onClick: () => void }) {
  const color = STATUS_COLOR[sensor.status];
  const ts = new Date(sensor.ultimaLeitura).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors ${!isLast ? 'border-b border-border/50' : ''}`}
      aria-label={`Sensor ${sensor.id}: ${STATUS_LABEL[sensor.status]}`}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }} aria-hidden="true">
        <i className={`fas ${TIPO_ICON[sensor.tipo]}`} style={{ color, fontSize: '0.8rem' }}></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>{sensor.id}</span>
          <span className="text-muted-foreground" style={{ fontSize: '0.7rem' }}>· {sensor.zona}{sensor.lugar ? ` · ${sensor.lugar}` : ''}</span>
        </div>
        <p className="text-muted-foreground" style={{ fontSize: '0.68rem' }}>
          Firmware {sensor.firmware} · Última leitura: {ts}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {sensor.status !== 'operacional' && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color, background: `${color}20` }} className="px-1.5 py-0.5 rounded-full hidden sm:inline">
            {STATUS_LABEL[sensor.status]}
          </span>
        )}
        <i
          className={`fas ${STATUS_ICON[sensor.status]}`}
          style={{ color, fontSize: '0.85rem' }}
          aria-hidden="true"
        ></i>
        <i className="fas fa-chevron-right text-muted-foreground/30" style={{ fontSize: '0.7rem' }} aria-hidden="true"></i>
      </div>
    </button>
  );
}

// ─── SensorDetailModal ────────────────────────────────────────────────────────
function SensorDetailModal({
  sensor,
  onClose,
  onUpdate,
}: {
  sensor: SensorDevice;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const color = STATUS_COLOR[sensor.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Detalhe do sensor ${sensor.id}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }} aria-hidden="true">
            <i className={`fas ${TIPO_ICON[sensor.tipo]}`} style={{ color, fontSize: '1.1rem' }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800 }}>{sensor.id}</h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>{sensor.parqueNome} · {sensor.zona}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        {/* Status badge */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: `${color}20`, color }}>
            <i className={`fas ${STATUS_ICON[sensor.status]}`} aria-hidden="true"></i>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {sensor.tipo}
          </span>
        </div>

        {/* Metadata grid */}
        <div className="bg-muted/30 rounded-xl p-3 mb-4 grid grid-cols-2 gap-x-4 gap-y-2" style={{ fontSize: '0.78rem' }}>
          <MetaRow label="Uptime" value={`${sensor.uptimePercent}%`} />
          <MetaRow label="Taxa Falsos-Pos." value={`${sensor.taxaFalsosPositivos}%`} />
          <MetaRow label="Firmware" value={sensor.firmware} mono />
          <MetaRow label="Instalado em" value={sensor.instaladoEm} />
          <MetaRow label="Últ. Manutenção" value={sensor.ultimaManutencao} />
          <MetaRow label="Última Leitura" value={new Date(sensor.ultimaLeitura).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} />
        </div>

        {/* Error history */}
        <div className="mb-4">
          <h3 className="text-foreground mb-2" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
            <i className="fas fa-list-ul text-primary mr-1.5" aria-hidden="true"></i>
            Histórico de Erros ({sensor.historicoErros.length})
          </h3>
          {sensor.historicoErros.length === 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
              <i className="fas fa-check-circle text-green-500 mb-1" style={{ fontSize: '1.2rem' }} aria-hidden="true"></i>
              <p className="text-green-700 dark:text-green-400" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Sem erros registados</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {sensor.historicoErros.map(e => (
                <div key={e.id} className="border border-border rounded-xl p-2.5">
                  <div className="flex items-start gap-2">
                    <i
                      className={`fas mt-0.5 flex-shrink-0 ${e.resolvido ? 'fa-check text-green-500' : 'fa-circle-exclamation text-destructive'}`}
                      style={{ fontSize: '0.75rem' }}
                      aria-hidden="true"
                    ></i>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700 }}>{e.codigo}</span>
                        <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>
                          {new Date(e.timestamp).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-foreground/80 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{e.descricao}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            onClick={onUpdate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
            style={{ fontSize: '0.85rem', fontWeight: 700 }}
          >
            <i className="fas fa-pen-to-square" aria-hidden="true"></i>
            Atualizar Estado
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
            style={{ fontSize: '0.85rem' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StatusUpdateModal (US#14) ────────────────────────────────────────────────
function StatusUpdateModal({
  sensor,
  onClose,
  onConfirm,
}: {
  sensor: SensorDevice;
  onClose: () => void;
  onConfirm: (id: string, status: SensorStatus, notes: string) => void;
}) {
  const [newStatus, setNewStatus] = useState<SensorStatus>(sensor.status);
  const [notes, setNotes] = useState('');

  const statusOptions: { value: SensorStatus; label: string; icon: string; color: string }[] = [
    { value: 'operacional', label: 'Operacional', icon: 'fa-circle-check', color: STATUS_COLOR.operacional },
    { value: 'manutencao',  label: 'Manutenção',  icon: 'fa-wrench',       color: STATUS_COLOR.manutencao },
    { value: 'falha',       label: 'Falha',        icon: 'fa-circle-xmark', color: STATUS_COLOR.falha },
    { value: 'offline',     label: 'Offline',      icon: 'fa-circle-minus', color: STATUS_COLOR.offline },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Atualizar estado do sensor">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl">

        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-pen-to-square text-primary" style={{ fontSize: '1.1rem' }} aria-hidden="true"></i>
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 800 }}>Atualizar Estado</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <p className="text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
          Sensor: <span className="text-foreground font-bold" style={{ fontFamily: 'monospace' }}>{sensor.id}</span>
          <br />
          Estado atual: <span style={{ color: STATUS_COLOR[sensor.status], fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
        </p>

        <div
          role="radiogroup"
          aria-label="Novo estado do sensor"
          className="space-y-2 mb-4"
        >
          {statusOptions.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                newStatus === opt.value
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <input
                type="radio"
                name="sensorStatus"
                value={opt.value}
                checked={newStatus === opt.value}
                onChange={() => setNewStatus(opt.value)}
                className="sr-only"
                aria-label={opt.label}
              />
              <i className={`fas ${opt.icon}`} style={{ color: opt.color, fontSize: '1rem', width: '16px', textAlign: 'center' }} aria-hidden="true"></i>
              <span className="text-foreground" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{opt.label}</span>
              {newStatus === opt.value && (
                <i className="fas fa-check text-primary ml-auto" style={{ fontSize: '0.8rem' }} aria-hidden="true"></i>
              )}
            </label>
          ))}
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label htmlFor="status-notes" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Notas técnicas (opcional)
          </label>
          <textarea
            id="status-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Descrição da reparação, componentes substituídos, observações…"
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
            style={{ fontSize: '0.8rem', lineHeight: 1.5 }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(sensor.id, newStatus, notes)}
            disabled={newStatus === sensor.status && notes.trim() === ''}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            Confirmar Atualização
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reutilizáveis ────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, subValue, trend, color }: {
  icon: string; label: string; value: string; subValue: string;
  trend: 'up' | 'down' | 'warn' | 'neutral'; color: string;
}) {
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : trend === 'warn' ? '#f59e0b' : 'var(--color-muted-foreground)';
  const trendIcon  = trend === 'up' ? 'fa-arrow-trend-up' : trend === 'down' ? 'fa-arrow-trend-down' : trend === 'warn' ? 'fa-triangle-exclamation' : 'fa-minus';
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }} aria-hidden="true">
          <i className={`fas ${icon}`} style={{ color, fontSize: '1rem' }}></i>
        </div>
      </div>
      <p className="text-foreground" style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1, marginTop: '0.25rem' }}>{value}</p>
      <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem', fontWeight: 600 }}>{label}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <i className={`fas ${trendIcon}`} style={{ color: trendColor, fontSize: '0.65rem' }} aria-hidden="true"></i>
        <span style={{ fontSize: '0.7rem', color: trendColor }}>{subValue}</span>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground" style={{ fontSize: '0.68rem', fontWeight: 500 }}>{label}</p>
      <p className="text-foreground" style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>{value}</p>
    </div>
  );
}
