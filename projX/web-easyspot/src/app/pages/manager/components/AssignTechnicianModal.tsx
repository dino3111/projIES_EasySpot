import { useState, useEffect, useRef } from 'react';
import {
  fetchTechnicians,
  assignTechnicianToPark,
  removeTechnicianFromPark,
  type TechnicianSummary,
} from '../../../services/managerApi';

interface Props {
  readonly parkId: string;
  readonly parkName: string;
  readonly currentTechnicians: TechnicianSummary[];
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

export function AssignTechnicianModal({ parkId, parkName, currentTechnicians, onClose, onSaved }: Props) {
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const current = currentTechnicians[0] ?? null;
  const [selected, setSelected] = useState<TechnicianSummary | null>(current);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTechnicians().then(setTechnicians).catch(() => setTechnicians([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = technicians.filter(
    (t) =>
      (!selected || t.id !== selected.id) &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase())),
  );

  const handleSelect = (tech: TechnicianSummary) => {
    setSelected(tech);
    setSearch('');
    setShowDropdown(false);
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      if (selected) {
        await assignTechnicianToPark(parkId, selected.id);
      } else if (current) {
        await removeTechnicianFromPark(parkId, current.id);
      }
      onSaved();
      onClose();
    } catch {
      setError('Erro ao guardar atribuição.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Atribuir técnico a ${parkName}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Técnico Responsável
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>{parkName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* Técnico selecionado */}
        {selected ? (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-user-gear text-primary" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground truncate" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{selected.name}</p>
              <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>{selected.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remover técnico"
            >
              <i className="fas fa-xmark" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-600" style={{ fontSize: '0.78rem' }}>
              <i className="fas fa-circle-exclamation mr-1.5" aria-hidden="true" />
              Nenhum técnico atribuído
            </p>
          </div>
        )}

        {/* Combobox pesquisável */}
        <div className="relative mb-4" ref={dropdownRef}>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/30 focus-within:border-primary transition-colors">
            <i className="fas fa-magnifying-glass text-muted-foreground flex-shrink-0" style={{ fontSize: '0.8rem' }} aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder={selected ? 'Substituir técnico...' : 'Pesquisar técnico...'}
              className="flex-1 bg-transparent text-foreground outline-none"
              style={{ fontSize: '0.875rem' }}
              autoComplete="off"
            />
          </div>

          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: '0.8rem' }}>
                  {technicians.length === 0 ? 'Nenhum técnico disponível' : 'Nenhum resultado'}
                </div>
              ) : (
                filtered.map((tech) => (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => handleSelect(tech)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-user-gear text-primary" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{tech.name}</p>
                      <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>{tech.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-destructive/10 text-destructive flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            style={{ fontSize: '0.85rem', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontSize: '0.85rem', fontWeight: 700 }}
          >
            {saving ? <i className="fas fa-circle-notch fa-spin" aria-hidden="true" /> : <i className="fas fa-floppy-disk" aria-hidden="true" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
