import { useState, useEffect, useRef } from 'react';
import {
  createTechnician,
  fetchParkAssignments,
  fetchTechnicians,
  type ParkAssignment,
  type TechnicianSummary,
} from '../../../services/managerApi';
import { fetchParksList } from '../../../services/parksApi';

interface ParkOption { id: string; name: string; city: string; }

interface Props {
  readonly onClose: () => void;
  readonly onCreated: () => void;
}

export function CreateTechnicianModal({ onClose, onCreated }: Props) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [parks, setParks] = useState<ParkOption[]>([]);
  const [assignments, setAssignments] = useState<ParkAssignment[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<TechnicianSummary[]>([]);
  const [parkSearch, setParkSearch] = useState('');
  const [selectedParks, setSelectedParks] = useState<ParkOption[]>([]);
  const [showParkDropdown, setShowParkDropdown] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchParksList({ pageSize: 200 })
      .then((r) => setParks(r.items.map((p) => ({ id: p.id, name: p.name, city: p.localidade }))))
      .catch(() => setParks([]));
    fetchParkAssignments().then(setAssignments).catch(() => setAssignments([]));
    fetchTechnicians().then(setAllTechnicians).catch(() => setAllTechnicians([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowParkDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentTechnicianName = (parkId: string): string | null => {
    const a = assignments.find((x) => x.parkId === parkId);
    if (!a || a.technicians.length === 0) return null;
    const tech = allTechnicians.find((t) => t.id === a.technicians[0].id);
    return tech?.name ?? a.technicians[0].name ?? null;
  };

  const filteredParks = parks.filter(
    (p) =>
      !selectedParks.some((s) => s.id === p.id) &&
      (p.name.toLowerCase().includes(parkSearch.toLowerCase()) ||
        p.city.toLowerCase().includes(parkSearch.toLowerCase())),
  );

  const handleAddPark = (park: ParkOption) => {
    setSelectedParks((prev) => [...prev, park]);
    setParkSearch('');
    setShowParkDropdown(false);
  };

  const handleRemovePark = (id: string) => {
    setSelectedParks((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = async () => {
    setError(null);
    if (!username || !name || !email || !password) {
      setError('Preenche todos os campos obrigatórios.');
      return;
    }
    if (password.length < 8) {
      setError('Password deve ter mínimo 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await createTechnician({
        username,
        name,
        email,
        temporaryPassword: password,
        parkIds: selectedParks.map((p) => p.id),
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar técnico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Criar técnico"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Novo Técnico
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
              Conta criada com password temporária — muda no primeiro login
            </p>
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

        <div className="space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <Field id="tech-username" label="Username *" icon="fa-at">
              <input
                id="tech-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: joao.silva"
                className="w-full bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
                autoComplete="off"
              />
            </Field>
            <Field id="tech-name" label="Nome Completo *" icon="fa-user">
              <input
                id="tech-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: João Silva"
                className="w-full bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
              />
            </Field>
          </div>

          <Field id="tech-email" label="Email *" icon="fa-envelope">
            <input
              id="tech-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: joao.silva@easyspot.pt"
              className="w-full bg-transparent text-foreground outline-none"
              style={{ fontSize: '0.875rem' }}
              autoComplete="off"
            />
          </Field>

          <div>
            <label htmlFor="tech-password" className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              <i className="fas fa-lock text-primary mr-1.5" aria-hidden="true" />
              Password Temporária *
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/30 focus-within:border-primary transition-colors">
              <input
                id="tech-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
                className="flex-1 bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.8rem' }} aria-hidden="true" />
              </button>
            </div>
            <p className="text-muted-foreground mt-1" style={{ fontSize: '0.72rem' }}>
              <i className="fas fa-info-circle mr-1" aria-hidden="true" />
              O técnico será obrigado a mudar a password no primeiro login
            </p>
          </div>

          {/* Parques — combobox multi-select */}
          <div>
            <label className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              <i className="fas fa-parking text-primary mr-1.5" aria-hidden="true" />
              Parques Responsável
            </label>

            {selectedParks.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2">
                {selectedParks.map((p) => {
                  const existingTech = getCurrentTechnicianName(p.id);
                  return (
                    <div key={p.id} className="flex flex-col gap-0.5">
                      <span
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/15 text-primary self-start"
                        style={{ fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        <i className="fas fa-parking" style={{ fontSize: '0.65rem' }} aria-hidden="true" />
                        {p.name}
                        <button
                          type="button"
                          onClick={() => handleRemovePark(p.id)}
                          className="hover:opacity-70 transition-opacity"
                          aria-label={`Remover ${p.name}`}
                        >
                          <i className="fas fa-xmark" style={{ fontSize: '0.65rem' }} aria-hidden="true" />
                        </button>
                      </span>
                      {existingTech && (
                        <p className="text-amber-600 pl-1" style={{ fontSize: '0.7rem' }}>
                          <i className="fas fa-triangle-exclamation mr-1" aria-hidden="true" />
                          Já atribuído a <strong>{existingTech}</strong> — será substituído
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/30 focus-within:border-primary transition-colors">
                <i className="fas fa-magnifying-glass text-muted-foreground flex-shrink-0" style={{ fontSize: '0.8rem' }} aria-hidden="true" />
                <input
                  value={parkSearch}
                  onChange={(e) => { setParkSearch(e.target.value); setShowParkDropdown(true); }}
                  onFocus={() => setShowParkDropdown(true)}
                  placeholder="Pesquisar e adicionar parques..."
                  className="flex-1 bg-transparent text-foreground outline-none"
                  style={{ fontSize: '0.875rem' }}
                  autoComplete="off"
                />
              </div>

              {showParkDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                  {filteredParks.length === 0 ? (
                    <div className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: '0.8rem' }}>
                      Nenhum parque encontrado
                    </div>
                  ) : (
                    filteredParks.map((park) => (
                      <button
                        key={park.id}
                        type="button"
                        onClick={() => handleAddPark(park)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-parking text-primary" style={{ fontSize: '0.7rem' }} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground truncate" style={{ fontSize: '0.82rem', fontWeight: 600 }}>{park.name}</p>
                          <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>{park.city}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
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
            {saving ? (
              <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
            ) : (
              <i className="fas fa-user-plus" aria-hidden="true" />
            )}
            Criar Técnico
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, icon, children,
}: {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-foreground mb-1.5" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
        <i className={`fas ${icon} text-primary mr-1.5`} aria-hidden="true" />
        {label}
      </label>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/30 focus-within:border-primary transition-colors">
        {children}
      </div>
    </div>
  );
}
