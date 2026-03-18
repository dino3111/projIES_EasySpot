import type { BillingRecord } from '../../../data/gestorData';
import { QuickStat } from './shared';

export function FaturacaoTab({ billingRecords }: { billingRecords: BillingRecord[] }) {
  const totalPago       = billingRecords.filter(r => r.estado === 'pago').reduce((s, r) => s + r.total, 0);
  const totalPendente   = billingRecords.filter(r => r.estado === 'pendente').reduce((s, r) => s + r.total, 0);
  const totalContestado = billingRecords.filter(r => r.estado === 'contestado').reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Pago"       value={`€${totalPago.toFixed(2)}`}       color="#22c55e" icon="fa-circle-check" />
        <QuickStat label="Pendente"   value={`€${totalPendente.toFixed(2)}`}   color="#f59e0b" icon="fa-hourglass-half" />
        <QuickStat label="Contestado" value={`€${totalContestado.toFixed(2)}`} color="#d4183d" icon="fa-circle-xmark" />
      </div>

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

      <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
        <i className="fas fa-info-circle mr-1" aria-hidden="true"></i>
        A cobrança é realizada automaticamente via leitura de matrícula OCR ou identificador RFID (Via Verde).
        Registos dos últimos 2 dias.
      </p>
    </div>
  );
}

function BillingRow({ record }: { record: BillingRecord }) {
  const estadoColor =
    record.estado === 'pago' ? '#22c55e' :
    record.estado === 'pendente' ? '#f59e0b' : '#d4183d';
  const estadoLabel =
    record.estado === 'pago' ? 'Pago' :
    record.estado === 'pendente' ? 'Pendente' : 'Contestado';
  const metodoIcon =
    record.metodo === 'RFID' ? 'fa-wifi' :
    record.metodo === 'OCR' ? 'fa-camera' : 'fa-user';

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
      <td className="px-3 py-3 text-right text-foreground">€{record.valorEstacionamento.toFixed(2)}</td>
      <td className="px-3 py-3 text-right">
        {record.valorEV ? (
          <span className="text-green-600 dark:text-green-400">€{record.valorEV.toFixed(2)}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right text-foreground" style={{ fontWeight: 700 }}>
        €{record.total.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-center">
        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: '0.68rem', fontWeight: 700, background: `${estadoColor}20`, color: estadoColor }}>
          {estadoLabel}
        </span>
      </td>
    </tr>
  );
}
