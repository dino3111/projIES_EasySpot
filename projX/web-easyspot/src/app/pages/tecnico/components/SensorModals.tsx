import { useState } from 'react';
import { type SensorDevice, type SensorStatus } from '../../../data/technicianData';
import { mockParkingLots } from '../../../data/parkingData';
import { STATUS_COLOR, STATUS_LABEL, STATUS_ICON, TIPO_ICON } from './manutencaoTypes';
import { MetaRow, TechMapLegend } from './shared';

export function SensorDiagPanel({
  sensor, onClose, onUpdate,
}: {
  sensor: SensorDevice;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);
  const color = STATUS_COLOR[sensor.status];
  const lot = mockParkingLots.find(l => l.id === sensor.parqueId) ?? null;
  const activeFloor = lot?.floors?.[activeFloorIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Diagnóstico: ${sensor.id}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }} aria-hidden="true">
            <i className={`fas ${TIPO_ICON[sensor.tipo]}`} style={{ color, fontSize: '1.1rem' }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800 }}>{sensor.id}</h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
              {sensor.parqueNome} · {sensor.zona}{sensor.lugar ? ` · ${sensor.lugar}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: `${color}20`, color }}>
            <i className={`fas ${STATUS_ICON[sensor.status]}`} aria-hidden="true"></i>
            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sensor.tipo}</span>
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{sensor.firmware}</span>
        </div>

        {lot?.floors && lot.floors.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {lot.floors.map((floor, idx) => (
                <button
                  key={floor.id}
                  onClick={() => setActiveFloorIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    activeFloorIdx === idx ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {floor.name}
                </button>
              ))}
            </div>
            {activeFloor && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground font-bold" style={{ fontSize: '0.75rem' }}>Localização no {activeFloor.name}</span>
                  <div className="flex flex-wrap gap-2">
                    <TechMapLegend color="#22c55e" label="Operacional" />
                    <TechMapLegend color="#d4183d" label="Falha" />
                    <TechMapLegend color="#f59e0b" label="Manutenção" />
                    <TechMapLegend color="#6b7280" label="Offline" />
                    <TechMapLegend color="#3b82f6" label="Este sensor" />
                  </div>
                </div>
                <div className="p-3 overflow-x-auto scrollbar-none flex justify-center bg-muted/10 overscroll-x-contain">
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${activeFloor.cols}, 34px)` }}>
                    {activeFloor.spots.map(spot => {
                      const isSensorSpot = sensor.lugar === spot.label;
                      return (
                        <div
                          key={spot.id}
                          className={`flex flex-col items-center justify-center rounded-lg shadow-sm cursor-pointer transition-all ${isSensorSpot ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : ''}`}
                          style={{ width: 34, height: 34, background: isSensorSpot ? '#3b82f6' : 'var(--color-muted)', opacity: isSensorSpot ? 1 : 0.4 }}
                          title={`Lugar ${spot.label}`}
                          aria-label={`Lugar ${spot.label}${isSensorSpot ? ' - Este sensor' : ''}`}
                        >
                          <i className={`fas ${isSensorSpot ? 'fa-microchip' : 'fa-square'} text-white text-[10px]`} aria-hidden="true" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-muted/30 rounded-xl p-3 mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
          <MetaRow label="Uptime"           value={`${sensor.uptimePercent}%`} />
          <MetaRow label="Taxa Falsos-Pos." value={`${sensor.taxaFalsosPositivos}%`} />
          <MetaRow label="Instalado em"     value={sensor.instaladoEm} />
          <MetaRow label="Últ. Manutenção"  value={sensor.ultimaManutencao} />
          <MetaRow label="Última Leitura"   value={new Date(sensor.ultimaLeitura).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} />
          <MetaRow label="Zona"             value={sensor.zona} />
        </div>

        <h3 className="text-foreground mb-2" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
          <i className="fas fa-list-ul text-primary mr-1.5" aria-hidden="true"></i>
          Histórico de Erros ({sensor.historicoErros.length})
        </h3>
        {sensor.historicoErros.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center mb-4">
            <i className="fas fa-check-circle text-green-500" style={{ fontSize: '1.2rem' }} aria-hidden="true"></i>
            <p className="text-green-700 dark:text-green-400 mt-1" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Sem erros registados</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
            {sensor.historicoErros.map(e => (
              <div key={e.id} className={`border rounded-xl p-2.5 ${e.resolvido ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-start gap-2">
                  <i className={`fas mt-0.5 ${e.resolvido ? 'fa-check text-green-500' : 'fa-circle-exclamation text-destructive'}`} style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700 }}>{e.codigo}</span>
                      <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>
                        {new Date(e.timestamp).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-foreground/80 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{e.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            onClick={onUpdate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
            style={{ fontSize: '0.875rem', fontWeight: 700 }}
          >
            <i className="fas fa-pen-to-square" aria-hidden="true"></i>
            Atualizar Estado
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusUpdateModal({
  sensor, onClose, onConfirm,
}: {
  sensor: SensorDevice;
  onClose: () => void;
  onConfirm: (id: string, status: SensorStatus, notes: string) => void;
}) {
  const [newStatus, setNewStatus] = useState<SensorStatus>(sensor.status);
  const [notes, setNotes] = useState('');

  const options: { value: SensorStatus; label: string; icon: string; desc: string }[] = [
    { value: 'operacional', label: 'Operacional', icon: 'fa-circle-check', desc: 'Sensor reparado e em funcionamento normal' },
    { value: 'manutencao',  label: 'Manutenção',  icon: 'fa-wrench',       desc: 'Intervenção em curso, monitoring suspenso' },
    { value: 'falha',       label: 'Falha',        icon: 'fa-circle-xmark', desc: 'Falha confirmada, aguarda reparação' },
    { value: 'offline',     label: 'Offline',      icon: 'fa-circle-minus', desc: 'Sem comunicação, fora de serviço' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Atualizar estado do sensor">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-md shadow-2xl">

        <div className="flex items-center gap-2 mb-1">
          <i className="fas fa-pen-to-square text-primary" style={{ fontSize: '1.1rem' }} aria-hidden="true"></i>
          <h2 className="text-foreground" style={{ fontSize: '1rem', fontWeight: 800 }}>Atualizar Estado do Sensor</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <p className="text-muted-foreground mb-4" style={{ fontSize: '0.78rem' }}>
          Sensor: <span className="text-foreground font-bold" style={{ fontFamily: 'monospace' }}>{sensor.id}</span>
          {' · '}Estado atual:{' '}
          <span style={{ color: STATUS_COLOR[sensor.status], fontWeight: 700 }}>{STATUS_LABEL[sensor.status]}</span>
        </p>

        <div role="radiogroup" aria-label="Novo estado" className="space-y-2 mb-4">
          {options.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                newStatus === opt.value ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <input type="radio" name="newStatus" value={opt.value} checked={newStatus === opt.value} onChange={() => setNewStatus(opt.value)} className="sr-only" />
              <i className={`fas ${opt.icon} flex-shrink-0`} style={{ color: STATUS_COLOR[opt.value], fontSize: '1rem', width: '16px', textAlign: 'center' }} aria-hidden="true"></i>
              <div className="flex-1 min-w-0">
                <p className="text-foreground" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{opt.label}</p>
                <p className="text-muted-foreground" style={{ fontSize: '0.68rem' }}>{opt.desc}</p>
              </div>
              {newStatus === opt.value && <i className="fas fa-check text-primary" style={{ fontSize: '0.8rem' }} aria-hidden="true"></i>}
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label htmlFor="update-notes" className="block text-foreground mb-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Notas Técnicas <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            id="update-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Reparação efetuada, componentes substituídos, observações técnicas…"
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
