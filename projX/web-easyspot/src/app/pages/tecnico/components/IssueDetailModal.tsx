import { type IssueReport } from '../../../data/gestorData';
import { type SensorDevice } from '../../../data/technicianData';
import { STATUS_COLOR, STATUS_LABEL } from './manutencaoTypes';
import { MetaRow } from './shared';

export function IssueDetailModal({
  issue,
  sensor,
  onClose,
  onUpdateSensor,
}: {
  issue: IssueReport;
  sensor: SensorDevice | null;
  onClose: () => void;
  onUpdateSensor: (s: SensorDevice) => void;
}) {
  const sevColor = issue.severidade === 'critica' ? '#d4183d' : issue.severidade === 'aviso' ? '#f59e0b' : '#3b82f6';
  const tipoIcon = issue.tipo === 'sensor' ? 'fa-microchip' : issue.tipo === 'cliente' ? 'fa-user-circle' : 'fa-server';
  const reportadorInfo =
    issue.tipo === 'cliente' && issue.matricula
      ? { label: 'Matrícula do Veículo', value: issue.matricula, icon: 'fa-car' }
      : issue.tipo === 'sensor' && issue.sensorId
      ? { label: 'ID do Sensor', value: issue.sensorId, icon: 'fa-microchip' }
      : { label: 'Origem', value: 'Sistema', icon: 'fa-server' };

  const handleDownloadReport = () => {
    const reportData = {
      ocorrenciaID: issue.id,
      parque: issue.parque,
      zona: issue.zona || '-',
      tipo: issue.tipo,
      severidade: issue.severidade,
      estado: issue.estado,
      descricao: issue.descricao,
      reportadorInfo,
      dataCriacao: issue.criadoEm,
      atribuidoA: issue.atribuidoA || '-',
      ...(sensor && {
        sensor: {
          id: sensor.id, tipo: sensor.tipo, status: sensor.status,
          uptimePercent: sensor.uptimePercent, taxaFalsosPositivos: sensor.taxaFalsosPositivos,
          firmware: sensor.firmware, ultimaManutencao: sensor.ultimaManutencao,
          ultimaLeitura: sensor.ultimaLeitura,
          historicoErros: sensor.historicoErros.map(e => ({ codigo: e.codigo, descricao: e.descricao, timestamp: e.timestamp, resolvido: e.resolvido })),
        },
      }),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ocorrencia-${issue.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Detalhe: ${issue.parque}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${sevColor}15` }} aria-hidden="true">
            <i className={`fas ${tipoIcon}`} style={{ color: sevColor, fontSize: '1rem' }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>{issue.parque}</h2>
            {issue.zona && <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>{issue.zona}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground" aria-label="Fechar">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>
              <i className="fas fa-file-alt text-primary mr-1.5" aria-hidden="true"></i>
              Ficha do Reporte
            </h3>
            <button
              onClick={handleDownloadReport}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/20 text-primary transition-colors"
              title="Descarregar relatório em JSON"
              aria-label="Descarregar relatório"
            >
              <i className="fas fa-download" style={{ fontSize: '0.85rem' }} aria-hidden="true"></i>
            </button>
          </div>
          <div className="mb-3 pb-3 border-b border-primary/10">
            <p className="text-muted-foreground text-xs mb-1.5" style={{ fontWeight: 500 }}>
              <i className={`fas ${reportadorInfo.icon} mr-1.5`} aria-hidden="true"></i>
              {reportadorInfo.label}
            </p>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{reportadorInfo.value}</p>
            <p className="text-muted-foreground text-xs mt-1.5">
              <i className="fas fa-clock mr-1" aria-hidden="true"></i>
              {new Date(issue.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1.5" style={{ fontWeight: 500 }}>
              <i className="fas fa-exclamation-circle text-primary mr-1.5" aria-hidden="true"></i>
              Descrição do Problema
            </p>
            <p className="text-foreground/85" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{issue.descricao}</p>
          </div>
        </div>

        {sensor && (
          <div className="bg-muted/20 rounded-xl p-3 mb-4 grid grid-cols-2 gap-x-4 gap-y-2" style={{ fontSize: '0.78rem' }}>
            <MetaRow label="Estado Atual"    value={STATUS_LABEL[sensor.status]} color={STATUS_COLOR[sensor.status]} />
            <MetaRow label="Última Leitura"  value={new Date(sensor.ultimaLeitura).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} />
            <MetaRow label="Uptime"          value={`${sensor.uptimePercent}%`} />
            <MetaRow label="Taxa Falsos-Pos." value={`${sensor.taxaFalsosPositivos}%`} />
            <MetaRow label="Firmware"        value={sensor.firmware} mono />
            <MetaRow label="Últ. Manutenção" value={sensor.ultimaManutencao} />
          </div>
        )}

        {sensor && (
          <div className="mb-4">
            <h3 className="text-foreground mb-2" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
              <i className="fas fa-list-ul text-primary mr-1.5" aria-hidden="true"></i>
              Histórico Completo de Erros ({sensor.historicoErros.length})
            </h3>
            {sensor.historicoErros.length === 0 ? (
              <p className="text-muted-foreground text-center py-3" style={{ fontSize: '0.78rem' }}>Sem erros registados para este sensor.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {sensor.historicoErros.map(e => (
                  <div key={e.id} className={`border rounded-xl p-2.5 ${e.resolvido ? 'border-green-200 dark:border-green-900' : 'border-destructive/30 bg-destructive/5'}`}>
                    <div className="flex items-start gap-2">
                      <i className={`fas mt-0.5 flex-shrink-0 ${e.resolvido ? 'fa-check text-green-500' : 'fa-circle-exclamation text-destructive'}`} style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-foreground" style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700 }}>{e.codigo}</span>
                          <span className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>
                            {new Date(e.timestamp).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {e.resolvido && <span className="text-green-500" style={{ fontSize: '0.62rem', fontWeight: 600 }}>Resolvido</span>}
                        </div>
                        <p className="text-foreground/80 mt-0.5" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{e.descricao}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border">
          {sensor && issue.estado !== 'resolvido' && (
            <button
              onClick={() => onUpdateSensor(sensor)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
              style={{ fontSize: '0.875rem', fontWeight: 700 }}
            >
              <i className="fas fa-pen-to-square" aria-hidden="true"></i>
              Atualizar Estado do Sensor
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground" style={{ fontSize: '0.875rem' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
