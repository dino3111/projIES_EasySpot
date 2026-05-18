import { useState } from 'react';
import { type SensorDevice } from '../../../data/technicianData';
import { type WorkOrder } from '../../../services/technicianApi';
import { STATUS_COLOR, STATUS_ICON, STATUS_LABEL, PRIO_COLOR, PRIO_LABEL, type TarefaFiltro } from './maintenanceTypes';
import { QuickStat, EmptyState } from './shared';

type TasksTabProps = Readonly<{
  orders: ReadonlyArray<WorkOrder>;
  completedOrders: ReadonlyArray<WorkOrder>;
  completedLoading: boolean;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  sensors: ReadonlyArray<SensorDevice>;
  onUpdate: (id: string, estado: 'em-progresso' | 'concluida') => void;
  onNewOrder: () => void;
}>;

type TarefaCardProps = Readonly<{
  order: WorkOrder;
  sensor?: SensorDevice;
  onUpdate: (id: string, estado: 'em-progresso' | 'concluida') => void;
  hasBorder: boolean;
}>;

function toUiEstado(state: string): 'pendente' | 'em-progresso' | 'concluida' {
  if (state === 'IN_PROGRESS') return 'em-progresso';
  if (state === 'RESOLVED')    return 'concluida';
  return 'pendente';
}

function toUiPrioridade(order: WorkOrder): 'critica' | 'alta' | 'media' | 'baixa' {
  const tag = order.notes?.match(/PRIORITY:(CRITICAL|HIGH|MEDIUM|LOW)/i)?.[1]?.toUpperCase();
  if (tag === 'CRITICAL') return 'critica';
  if (tag === 'HIGH') return 'alta';
  if (tag === 'MEDIUM') return 'media';
  if (tag === 'LOW') return 'baixa';
  const severity = order.severity;
  if (severity === 'CRITICAL') return 'critica';
  if (severity === 'WARNING')  return 'alta';
  if (severity === 'INFO')     return 'baixa';
  return 'media';
}

function getWeekBounds(weekOffset: number): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function formatWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return 'Esta semana';
  if (weekOffset === -1) return 'Semana passada';
  const { start, end } = getWeekBounds(weekOffset);
  const fmt = (d: Date) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function TasksTab({
  orders,
  completedOrders,
  completedLoading,
  weekOffset,
  onWeekChange,
  sensors,
  onUpdate,
  onNewOrder,
}: TasksTabProps) {
  const [tarefaFil, setTarefaFil] = useState<TarefaFiltro>('urgente');

  const urgentes  = orders.filter(o => {
    const p = toUiPrioridade(o);
    return p === 'critica' && toUiEstado(o.state) === 'pendente';
  });
  const emCurso   = orders.filter(o => toUiEstado(o.state) === 'em-progresso');
  const pendentes = orders.filter(o => toUiEstado(o.state) !== 'concluida');

  let visibleOrders: ReadonlyArray<WorkOrder>;
  switch (tarefaFil) {
    case 'urgente':      visibleOrders = urgentes;        break;
    case 'em-progresso': visibleOrders = emCurso;         break;
    case 'pendente':     visibleOrders = pendentes;       break;
    case 'concluida':    visibleOrders = completedOrders; break;
  }

  const filterConfig = {
    urgente:        { icon: 'fa-circle-exclamation', label: 'Urgente',    borderColor: 'border-red-500/30',   bg: 'rgba(212,24,61,0.04)' },
    'em-progresso': { icon: 'fa-spinner',            label: 'Em Curso',   borderColor: 'border-blue-500/30',  bg: 'rgba(59,130,246,0.04)' },
    pendente:       { icon: 'fa-hourglass-half',     label: 'Pendente',   borderColor: 'border-border',       bg: 'transparent' },
    concluida:      { icon: 'fa-circle-check',       label: 'Concluída',  borderColor: 'border-green-500/20', bg: 'transparent' },
  };

  const activeConfig = filterConfig[tarefaFil];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3 flex-wrap">
          {([
            { fil: 'urgente'      as TarefaFiltro, label: 'Urgentes',   count: urgentes.length,   color: '#d4183d', icon: 'fa-circle-exclamation' },
            { fil: 'em-progresso' as TarefaFiltro, label: 'Em Curso',   count: emCurso.length,    color: '#3b82f6', icon: 'fa-spinner' },
            { fil: 'pendente'     as TarefaFiltro, label: 'Pendentes',  count: pendentes.length,  color: '#f59e0b', icon: 'fa-hourglass-half' },
            { fil: 'concluida'    as TarefaFiltro, label: 'Concluídas', count: completedOrders.length, color: '#22c55e', icon: 'fa-circle-check' },
          ]).map(({ fil, label, count, color, icon }) => (
            <button
              key={fil}
              onClick={() => setTarefaFil(fil)}
              className={`transition-all transform ${tarefaFil === fil ? 'scale-105' : 'hover:scale-102'}`}
            >
              <QuickStat label={label} value={count} color={color} icon={icon} active={tarefaFil === fil} />
            </button>
          ))}
        </div>
        <button
          onClick={onNewOrder}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
          style={{ fontSize: '0.85rem', fontWeight: 700 }}
        >
          <i className="fas fa-plus" style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
          Nova Tarefa
        </button>
      </div>

      {tarefaFil === 'concluida' && (
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => onWeekChange(weekOffset - 1)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Semana anterior"
          >
            <i className="fas fa-chevron-left text-muted-foreground" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
          </button>
          <span className="text-foreground" style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '130px', textAlign: 'center' }}>
            {completedLoading ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : formatWeekLabel(weekOffset)}
          </span>
          <button
            onClick={() => onWeekChange(Math.min(weekOffset + 1, 0))}
            disabled={weekOffset >= 0}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Semana seguinte"
          >
            <i className="fas fa-chevron-right text-muted-foreground" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
          </button>
        </div>
      )}

      {visibleOrders.length === 0 ? (
        <EmptyState icon={activeConfig.icon} title={`Sem tarefas ${activeConfig.label.toLowerCase()}s`} desc="Nenhuma tarefa nesta categoria." />
      ) : (
        <div
          className={`rounded-2xl border overflow-hidden ${activeConfig.borderColor} ${tarefaFil === 'concluida' ? 'opacity-80' : ''}`}
          style={{ background: activeConfig.bg }}
        >
          {visibleOrders.map((order, idx) => (
            <TarefaCard
              key={order.id}
              order={order}
              sensor={sensors.find(s => s.id === order.sensorId)}
              onUpdate={onUpdate}
              hasBorder={idx < visibleOrders.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarefaCard({
  order, sensor, onUpdate, hasBorder,
}: TarefaCardProps) {
  const prioridade = toUiPrioridade(order);
  const estado     = toUiEstado(order.state);
  const priColor   = PRIO_COLOR[prioridade];

  return (
    <div className={`bg-card px-4 py-3.5 flex items-start gap-3 ${hasBorder ? 'border-b border-border' : ''}`}>
      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ background: priColor, minHeight: '32px' }} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-foreground" style={{ fontSize: '0.9rem', fontWeight: 700 }}>{order.description}</span>
          <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: '0.6rem', fontWeight: 700, background: `${priColor}20`, color: priColor }}>
            {PRIO_LABEL[prioridade]}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mt-1" style={{ fontSize: '0.7rem', color: 'var(--color-muted-foreground)' }}>
          <span><i className="fas fa-location-dot mr-1" aria-hidden="true"></i>{' '}{order.park}{order.zone ? ` · ${order.zone}` : ''}</span>
          {order.sensorId && (
            <span style={{ fontFamily: 'monospace' }}><i className="fas fa-microchip mr-1" aria-hidden="true"></i>{' '}{order.sensorId}</span>
          )}
          <span className="text-muted-foreground">
            <i className="fas fa-clock mr-1" aria-hidden="true"></i>{' '}
            {new Date(order.createdAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {sensor && sensor.status !== 'operacional' && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg" style={{ background: `${STATUS_COLOR[sensor.status]}12`, fontSize: '0.68rem' }}>
            <i className={`fas ${STATUS_ICON[sensor.status]}`} style={{ color: STATUS_COLOR[sensor.status] }} aria-hidden="true"></i>
            <span className="text-muted-foreground">Sensor:</span>
            <span style={{ color: STATUS_COLOR[sensor.status], fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
          </div>
        )}
        {order.attributedTo && (
          <p className="mt-1 text-muted-foreground" style={{ fontSize: '0.7rem' }}>
            <i className="fas fa-user mr-1" aria-hidden="true"></i>{' '}{order.attributedTo}
          </p>
        )}
      </div>
      {estado !== 'concluida' && (
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {estado === 'pendente' && (
            <button
              onClick={() => onUpdate(order.id, 'em-progresso')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
              style={{ fontSize: '0.72rem', fontWeight: 600 }}
              aria-label="Iniciar tarefa"
            >
              <i className="fas fa-play" style={{ fontSize: '0.62rem' }} aria-hidden="true"></i>
              Iniciar
            </button>
          )}
          <button
            onClick={() => onUpdate(order.id, 'concluida')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
            style={{ fontSize: '0.72rem', fontWeight: 600 }}
            aria-label="Concluir tarefa"
          >
            <i className="fas fa-check" style={{ fontSize: '0.62rem' }} aria-hidden="true"></i>
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}
