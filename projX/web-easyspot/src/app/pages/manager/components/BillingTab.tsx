import type { BillingRecord } from '../../../data/gestorData';
import { QuickStat } from './shared';

interface ParkOption {
  readonly id: string;
  readonly name: string;
}

interface BillingTabProps {
  readonly billingRecords: BillingRecord[];
  readonly page: number;
  readonly totalPages: number;
  readonly totalElements: number;
  readonly onPageChange: (p: number) => void;
  readonly parks?: ParkOption[];
  readonly parkFilter?: string;
  readonly onParkChange?: (id: string) => void;
  readonly stats?: { pago: number; pendente: number; contestado: number };
}

export function BillingTab({ billingRecords, page, totalPages, totalElements, onPageChange, parks, parkFilter, onParkChange, stats }: BillingTabProps) {
  const totalPago       = stats?.pago       ?? billingRecords.filter(r => r.estado === 'pago').reduce((s, r) => s + r.total, 0);
  const totalPendente   = stats?.pendente   ?? billingRecords.filter(r => r.estado === 'pendente').reduce((s, r) => s + r.total, 0);
  const totalContestado = stats?.contestado ?? billingRecords.filter(r => r.estado === 'contestado').reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Pago"       value={`€${totalPago.toFixed(2)}`}       color="#22c55e" icon="fa-circle-check" />
        <QuickStat label="Por pagar"  value={`€${totalPendente.toFixed(2)}`}   color="#f59e0b" icon="fa-hourglass-half" />
        <QuickStat label="Contestado" value={`€${totalContestado.toFixed(2)}`} color="#d4183d" icon="fa-circle-xmark" />
      </div>

      {parks && parks.length > 0 && onParkChange && (
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={parkFilter ?? ''}
            onChange={(e) => onParkChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
            aria-label="Filtrar por parque"
          >
            <option value="">Todos os parques</option>
            {parks.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '0.8rem', minWidth: '680px' }}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Parque</th>
                <th className="text-left text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Data/Hora</th>
                <th className="text-left text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Matrícula</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Método</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Duração</th>
                <th className="text-right text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Estac.</th>
                <th className="text-right text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>EV</th>
                <th className="text-right text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Total</th>
                <th className="text-center text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {billingRecords.map((record) => (
                <BillingRow key={record.id} record={record} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
            {totalElements} registos · página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              aria-label="Página anterior"
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              style={{ fontSize: '0.78rem' }}
            >
              <i className="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
            {Array.from(
              { length: Math.min(5, totalPages) },
              (_, j) => Math.max(0, Math.min(page - 2, totalPages - 5)) + j
            ).map(i => (
              <button
                key={i}
                onClick={() => onPageChange(i)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${i === page ? 'border-primary bg-primary text-white' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                style={{ fontSize: '0.78rem' }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              aria-label="Próxima página"
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              style={{ fontSize: '0.78rem' }}
            >
              <i className="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}

      <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
        <i className="fas fa-info-circle mr-1" aria-hidden="true"></i>
        A cobrança é realizada automaticamente via leitura de matrícula (OCR).
        Registos dos últimos 2 dias.
      </p>
    </div>
  );
}

function BillingRow({ record }: { readonly record: BillingRecord }) {
  const estadoMap = {
    pago: { color: '#22c55e', label: 'Pago' },
    pendente: { color: '#f59e0b', label: 'Por pagar' },
    contestado: { color: '#d4183d', label: 'Contestado' },
  };
  const metodoIconMap = {
    OCR: 'fa-camera',
    Manual: 'fa-user',
  };
  const estadoInfo = estadoMap[record.estado];
  const metodoIcon = metodoIconMap[record.metodo];

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-foreground" style={{ fontWeight: 500 }}>{record.parqueNome}</td>
      <td className="px-3 py-3 text-muted-foreground" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
        {record.data}
      </td>
      <td className="px-3 py-3">
        <span className="px-2 py-0.5 rounded-lg bg-muted text-foreground" style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700 }}>
          {record.matricula}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="flex items-center justify-center gap-1">
          <i className={`fas ${metodoIcon} text-primary`} style={{ fontSize: '0.75rem' }} aria-hidden="true"></i>
          <span className="text-muted-foreground">{record.metodo}</span>
        </span>
      </td>
      <td className="px-3 py-3 text-center text-muted-foreground">{record.duracao}</td>
      <td className="px-3 py-3 text-right text-foreground">
        {record.estado === 'pendente' ? <span className="text-muted-foreground/50">—</span> : `€${record.valorEstacionamento.toFixed(2)}`}
      </td>
      <td className="px-3 py-3 text-right">
        {record.estado === 'pendente' ? (
          <span className="text-muted-foreground/50">—</span>
        ) : record.valorEV ? (
          <span className="text-green-600 dark:text-green-400">€{record.valorEV.toFixed(2)}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right text-foreground" style={{ fontWeight: 700 }}>
        {record.estado === 'pendente' ? <span className="text-muted-foreground/50">—</span> : `€${record.total.toFixed(2)}`}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: '0.68rem', fontWeight: 700, background: `${estadoInfo.color}20`, color: estadoInfo.color }}>
          {estadoInfo.label}
        </span>
      </td>
    </tr>
  );
}
