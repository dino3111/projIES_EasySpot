import type { TariffEntry } from '../../../data/gestorData';
import { LegendBadge } from './shared';

export function TariffsTab({ onEdit, tariffs }: { readonly onEdit: (t: TariffEntry) => void; readonly tariffs: TariffEntry[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LegendBadge color="#22c55e" label="Ativo" />
        <LegendBadge color="#f59e0b" label="Em Revisão" />
        <LegendBadge color="#9ca3af" label="Suspenso" />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '0.82rem', minWidth: '680px' }}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Parque</th>
                <th className="text-left text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Cidade</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>€/hora</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Máx. Dia</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Mensal</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>EV (€/kWh)</th>
                <th className="text-center text-muted-foreground px-3 py-3" style={{ fontWeight: 600 }}>Estado</th>
                <th className="text-right text-muted-foreground px-4 py-3" style={{ fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((t) => (
                <TariffRow key={t.parqueId} tariff={t} onEdit={onEdit} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
        <i className="fas fa-info-circle mr-1" aria-hidden="true"></i>
        As alterações de tarifário requerem aprovação antes de entrarem em vigor.
        Última sincronização: 09/03/2026 às 08:00.
      </p>
    </div>
  );
}

function TariffRow({ tariff, onEdit }: { readonly tariff: TariffEntry; readonly onEdit: (t: TariffEntry) => void }) {
  const statusMap = {
    ativo: { color: '#22c55e', label: 'Ativo' },
    revisao: { color: '#f59e0b', label: 'Revisão' },
    suspenso: { color: '#9ca3af', label: 'Suspenso' },
  };
  const statusInfo = statusMap[tariff.estado];

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-foreground" style={{ fontWeight: 600 }}>{tariff.parqueNome}</td>
      <td className="px-3 py-3 text-muted-foreground">{tariff.cidade}</td>
      <td className="px-3 py-3 text-center text-foreground">€{tariff.tarifaHora.toFixed(2)}</td>
      <td className="px-3 py-3 text-center text-foreground">€{tariff.maxDiario.toFixed(2)}</td>
      <td className="px-3 py-3 text-center text-foreground">€{tariff.mensalidade.toFixed(2)}</td>
      <td className="px-3 py-3 text-center">
        {tariff.tarifaEV ? (
          <span className="text-green-600 dark:text-green-400" style={{ fontWeight: 600 }}>
            €{tariff.tarifaEV.toFixed(2)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className="px-2 py-0.5 rounded-full"
          style={{ fontSize: '0.68rem', fontWeight: 700, background: `${statusInfo.color}20`, color: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onEdit(tariff)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          style={{ fontSize: '0.72rem', fontWeight: 600 }}
          aria-label={`Editar tarifário de ${tariff.parqueNome}`}
        >
          <i className="fas fa-pen" style={{ fontSize: '0.65rem' }} aria-hidden="true"></i>
          Editar
        </button>
      </td>
    </tr>
  );
}
