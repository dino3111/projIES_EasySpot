import { useState } from 'react';
import { type SensorDevice, type MaintenanceOrder } from '../../../data/technicianData';
import { type IssueReport } from '../../../data/gestorData';
import { STATUS_LABEL, PRIO_COLOR, PRIO_LABEL } from './maintenanceTypes';
import { MetaRow } from './shared';

type Priority = MaintenanceOrder['prioridade'];

type NewOrderModalProps = Readonly<{
  sensors: SensorDevice[];
  onClose: () => void;
  onCreate: (order: MaintenanceOrder) => void;
}>;

type QuickTaskFromIssueModalProps = Readonly<{
  issue: IssueReport;
  sensors: SensorDevice[];
  onClose: () => void;
  onCreate: (order: MaintenanceOrder) => void;
}>;

type PrioritySelectorProps = Readonly<{
  value: Priority;
  onChange: (v: Priority) => void;
}>;

export function NewOrderModal({
  sensors, onClose, onCreate,
}: NewOrderModalProps) {
  const [sensorId, setSensorId]     = useState(sensors[0]?.id ?? '');
  const [titulo, setTitulo]         = useState('');
  const [descricao, setDescricao]   = useState('');
  const [prioridade, setPrioridade] = useState<Priority>('media');

  const handleSubmit = () => {
    if (!titulo.trim() || !sensorId) return;
    const sensor = sensors.find(s => s.id === sensorId);
    if (!sensor) return;
    onCreate({
      id: `ORD-${Date.now()}`,
      sensorId,
      parque: sensor.parqueNome,
      zona: sensor.zona,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      prioridade,
      estado: 'pendente',
      criadaEm: new Date().toISOString(),
      tecnico: 'Laura Farias',
    });
  };

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4" aria-label="Nova ordem de manutenção">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-plus-circle text-primary" style={{ fontSize: '1.1rem' }} aria-hidden="true"></i>
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 800 }}>Nova Ordem de Manutenção</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="order-sensor" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sensor</label>
            <select
              id="order-sensor"
              value={sensorId}
              onChange={e => setSensorId(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
            >
              {sensors.map(s => (
                <option key={s.id} value={s.id}>{s.id} — {s.parqueNome} · {STATUS_LABEL[s.status]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="order-titulo" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título</label>
            <input
              id="order-titulo"
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={100}
              placeholder="Resumo da intervenção"
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <div>
            <label htmlFor="order-desc" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descrição</label>
            <textarea
              id="order-desc"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Detalhes da intervenção necessária…"
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.8rem', lineHeight: 1.5 }}
            />
          </div>
          <PrioritySelector value={prioridade} onChange={setPrioridade} />
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim() || !sensorId}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            Criar Ordem
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function QuickTaskFromIssueModal({
  issue, sensors, onClose, onCreate,
}: QuickTaskFromIssueModalProps) {
  const [titulo, setTitulo]         = useState('');
  const [descricao, setDescricao]   = useState(issue.descricao);
  const [prioridade, setPrioridade] = useState<Priority>(
    issue.severidade === 'critica' ? 'critica' : 'alta'
  );

  const sensorId = issue.sensorId;
  const sensor = sensors.find(s => s.id === sensorId);

  const handleSubmit = () => {
    if (!titulo.trim() || !sensorId || !sensor) return;
    onCreate({
      id: `ORD-${Date.now()}`,
      sensorId,
      parque: issue.parque,
      zona: issue.zona ?? '',
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      prioridade,
      estado: 'pendente',
      criadaEm: new Date().toISOString(),
      tecnico: 'Laura Farias',
    });
  };

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4" aria-label="Criar tarefa de manutenção">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-plus-circle text-green-600 dark:text-green-400" style={{ fontSize: '1.1rem' }} aria-hidden="true"></i>
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 800 }}>Criar Tarefa</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="bg-muted/30 rounded-xl p-3 mb-4 space-y-2">
          <MetaRow label="Parque" value={issue.parque} />
          <MetaRow label="Sensor" value={sensorId || 'N/A'} mono />
          {issue.zona && <MetaRow label="Zona" value={issue.zona} />}
          <MetaRow label="Ocorrência" value={issue.descricao} />
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="quick-titulo" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título da Tarefa *</label>
            <input
              id="quick-titulo"
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={100}
              placeholder="Ex: Substituir sensor IR deficiente"
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <div>
            <label htmlFor="quick-desc" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descrição</label>
            <textarea
              id="quick-desc"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors"
              style={{ fontSize: '0.8rem', lineHeight: 1.5 }}
            />
          </div>
          <PrioritySelector value={prioridade} onChange={setPrioridade} />
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim()}
            className="flex-1 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            <i className="fas fa-check mr-1.5" aria-hidden="true"></i>
            Criar Tarefa
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  );
}

function PrioritySelector({
  value, onChange,
}: PrioritySelectorProps) {
  return (
    <div>
      <p className="text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Prioridade</p>
      <div className="flex gap-2">
        {(['critica', 'alta', 'media', 'baixa'] as const).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="flex-1 py-1.5 rounded-xl border transition-colors"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              background: value === p ? `${PRIO_COLOR[p]}20` : undefined,
              borderColor: value === p ? PRIO_COLOR[p] : undefined,
              color: value === p ? PRIO_COLOR[p] : undefined,
            }}
          >
            {PRIO_LABEL[p]}
          </button>
        ))}
      </div>
    </div>
  );
}
