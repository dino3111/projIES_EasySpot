import type { TariffEntry } from '../../../data/gestorData';
import { LegendBadge } from './shared';

const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra',
  'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre', 'Porto',
  'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu',
  'Funchal', 'Ponta Delgada',
];

interface TariffsTabProps {
  readonly onEdit: (t: TariffEntry) => void;
  readonly tariffs: TariffEntry[];
  readonly page: number;
  readonly totalPages: number;
  readonly totalElements: number;
  readonly district: string;
  readonly statusFilter: '' | 'ACTIVE' | 'SUSPENDED';
  readonly onPageChange: (p: number) => void;
  readonly onDistrictChange: (d: string) => void;
  readonly onStatusChange: (s: '' | 'ACTIVE' | 'SUSPENDED') => void;
}

export function TariffsTab({
  onEdit, tariffs, page, totalPages, totalElements,
  district, statusFilter, onPageChange, onDistrictChange, onStatusChange,
}: TariffsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* District filter */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
          <i className="fas fa-map-marker-alt text-muted-foreground" style={{ fontSize: '0.85rem' }}></i>
          <select
            value={district}
            onChange={e => onDistrictChange(e.target.value)}
            className="bg-transparent text-foreground outline-none"
            style={{ fontSize: '0.875rem' }}
            aria-label="Filtrar por distrito"
          >
            <option value="">Todos os distritos</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl overflow-hidden border border-border">
          {([['', 'Todos'], ['ACTIVE', 'Ativo'], ['SUSPENDED', 'Suspenso']] as ['' | 'ACTIVE' | 'SUSPENDED', string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => onStatusChange(val)}
              className={`px-3 py-1.5 transition-colors ${statusFilter === val ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <LegendBadge color="#22c55e" label="Ativo" />
          <LegendBadge color="#ef4444" label="Suspenso" />
        </div>
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
              {tariffs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                    Nenhum tarifário encontrado
                  </td>
                </tr>
              ) : (
                tariffs.map((t) => (
                  <TariffRow key={t.id ?? t.parqueId} tariff={t} onEdit={onEdit} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
            {totalElements} tarifários · página {page + 1} de {totalPages}
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
    </div>
  );
}

function TariffRow({ tariff, onEdit }: { readonly tariff: TariffEntry; readonly onEdit: (t: TariffEntry) => void }) {
  const statusMap: Record<'ativo' | 'suspenso', { color: string; label: string }> = {
    ativo: { color: '#22c55e', label: 'Ativo' },
    suspenso: { color: '#ef4444', label: 'Suspenso' },
  };
  const statusInfo = statusMap[tariff.estado];

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-foreground" style={{ fontWeight: 600 }}>{tariff.parqueNome}</td>
      <td className="px-3 py-3 text-muted-foreground">{tariff.cidade}</td>
      <td className="px-3 py-3 text-center text-foreground">€{(tariff.tarifaHora ?? 0).toFixed(2)}</td>
      <td className="px-3 py-3 text-center text-foreground">€{(tariff.maxDiario ?? 0).toFixed(2)}</td>
      <td className="px-3 py-3 text-center text-foreground">€{(tariff.mensalidade ?? 0).toFixed(2)}</td>
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
