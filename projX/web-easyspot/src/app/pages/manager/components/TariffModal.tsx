import { useState } from 'react';
import type { TariffEntry } from '../../../data/gestorData';
import { TariffInputRow } from './shared';

export function TariffModal({ 
  tariff, 
  onClose, 
  onSave 
}: { 
  readonly tariff: TariffEntry; 
  readonly onClose: () => void;
  readonly onSave: (updated: Partial<TariffEntry>) => Promise<void>;
}) {
  const [hora,   setHora]   = useState(tariff.tarifaHora.toString());
  const [maxDia, setMaxDia] = useState(tariff.maxDiario.toString());
  const [mensal, setMensal] = useState(tariff.mensalidade.toString());
  const [ev,     setEv]     = useState(tariff.tarifaEV?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        parqueId: tariff.parqueId,
        tarifaHora: parseFloat(hora),
        maxDiario: parseFloat(maxDia),
        mensalidade: parseFloat(mensal),
        tarifaEV: ev ? parseFloat(ev) : undefined,
        estado: 'revisao' // Usually when edited it goes to review
      });
      onClose();
    } catch (err) {
      console.error('Error saving tariff:', err);
      alert('Erro ao guardar tarifário. Por favor tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      aria-label={`Editar tarifário: ${tariff.parqueNome}`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-foreground" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Editar Tarifário
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
              {tariff.parqueNome} · {tariff.cidade}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <TariffInputRow id="tarifa-hora"  label="Tarifa por Hora (€)"  icon="fa-clock"            value={hora}   onChange={setHora}   />
          <TariffInputRow id="max-diario"   label="Máximo Diário (€)"    icon="fa-sun"              value={maxDia} onChange={setMaxDia} />
          <TariffInputRow id="mensalidade"  label="Mensalidade (€)"      icon="fa-calendar"         value={mensal} onChange={setMensal} />
          <TariffInputRow id="tarifa-ev"    label="Tarifa EV (€/kWh)"    icon="fa-charging-station" value={ev}     onChange={setEv}     optional />
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-5">
          <p className="text-yellow-600 dark:text-yellow-400" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            <i className="fas fa-triangle-exclamation mr-1.5" aria-hidden="true"></i>
            As alterações entram em vigor após aprovação.
            Clientes com subscrições ativas serão notificados.
          </p>
        </div>

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
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fas fa-paper-plane" aria-hidden="true"></i>
            )}
            Submeter para Revisão
          </button>
        </div>
      </div>
    </dialog>
  );
}
