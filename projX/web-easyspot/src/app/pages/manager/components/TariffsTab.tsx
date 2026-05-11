import { useState } from 'react';
import type { TariffEntry } from '../../../data/gestorData';
import { LegendBadge } from './shared';

const PAGE_SIZE = 10;

export function TariffsTab({ onEdit, tariffs }: { readonly onEdit: (t: TariffEntry) => void; readonly tariffs: TariffEntry[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = tariffs.filter(t =>
    t.parqueNome.toLowerCase().includes(search.toLowerCase()) ||
    t.cidade.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-card border border-border">
          <i className="fas fa-search text-muted-foreground" style={{ fontSize: '0.85rem' }}></i>
          <input
            type="text"
            placeholder="Pesquisar parque ou cidade..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-foreground outline-none"
            style={{ fontSize: '0.875rem' }}
          />
          {search && (
            <button onClick={() => handleSearch('')} className="text-muted-foreground hover:text-foreground">
              <i className="fas fa-xmark" style={{ fontSize: '0.8rem' }}></i>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LegendBadge color="#22c55e" label="Ativo" />
          <LegendBadge color="#f59e0b" label="Em Revisão" />
          <LegendBadge color="#9ca3af" label="Suspenso" />
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
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                    Nenhum tarifário encontrado
                  </td>
                </tr>
              ) : (
                paged.map((t) => (
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
            {filtered.length} tarifários · página {currentPage + 1} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              style={{ fontSize: '0.78rem' }}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(i => Math.abs(i - currentPage) <= 2)
              .map(i => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${i === currentPage ? 'border-primary bg-primary text-white' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                  style={{ fontSize: '0.78rem' }}
                >
                  {i + 1}
                </button>
              ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              style={{ fontSize: '0.78rem' }}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
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
