import { useEffect, useState } from 'react';
import { lookupVehicleData, type VehicleData } from '../../../../services/vehicleLookup';
import { violationTypes, inputBase, inputError, type ReportForm } from './reportTypes';
import type { ParkingLot } from '../../../data/parkingTypes';
import { fetchAllParksSummary } from '../../../services/parksCatalog';

interface Props {
  form: ReportForm;
  onChange: (updates: Partial<ReportForm>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string | null;
}

export function Step1Form({ form, onChange, onSubmit, onCancel, submitting = false, submitError = null }: Readonly<Props>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plateInfo, setPlateInfo] = useState<VehicleData | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [parks, setParks] = useState<ParkingLot[]>([]);

  useEffect(() => {
    fetchAllParksSummary().then(setParks).catch(() => setParks([]));
  }, []);

  const lookupPlate = async () => {
    if (!form.vehiclePlate.trim()) return;
    setLookingUp(true);
    setPlateInfo(null);
    try {
      const data = await lookupVehicleData(form.vehiclePlate.trim());
      setPlateInfo(data);
    } catch {
      setPlateInfo(null);
    } finally {
      setLookingUp(false);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.parkingLotId) e.parkingLotId = 'Selecione um parque';
    if (!form.zone.trim()) e.zone = 'Indique a zona';
    if (!form.spotNumber.trim()) e.spotNumber = 'Indique o número do lugar';
    if (!form.violationType) e.violationType = 'Selecione o tipo de infração';
    if (!form.description.trim() || form.description.length < 10)
      e.description = 'A descrição deve ter pelo menos 10 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5"
          aria-label="Voltar"
        >
          <i className="fas fa-arrow-left text-foreground" style={{ fontSize: '0.9rem' }} />
        </button>
        <div>
          <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
            Reportar Estacionamento Não Autorizado
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.85rem' }}>
            Ajude-nos a manter o parque seguro e acessível para todos.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6 bg-primary/8 border border-primary/25">
        <i className="fas fa-shield-halved text-primary mt-0.5 flex-shrink-0" style={{ fontSize: '1rem' }} />
        <div>
          <p className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>Denúncia rápida e anónima</p>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.8rem' }}>
            As suas denúncias ajudam a equipa a atuar e a garantir que os lugares especiais estão disponíveis para quem precisa.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-foreground flex items-center gap-2 mb-4" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-location-dot text-primary" style={{ fontSize: '0.7rem' }} />
            </span>
            Localização
          </h2>

          <div className="mb-4">
            <label htmlFor="parking-lot-input" className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.82rem' }}>
              Parque de Estacionamento <span className="text-error">*</span>
            </label>
            <div className="relative">
              <i className="fas fa-map-marker-alt absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none" style={{ fontSize: '0.8rem' }} />
              <select
                id="parking-lot-input"
                value={form.parkingLotId}
                onChange={(e) => onChange({ parkingLotId: e.target.value })}
                className={`${inputBase} pl-9 pr-8 appearance-none ${errors.parkingLotId ? inputError : ''}`}
                style={{ fontSize: '0.9rem' }}
                aria-invalid={!!errors.parkingLotId}
              >
                <option value="">Selecione o parque...</option>
                {parks.map((lot) => (
                  <option key={lot.id} value={lot.id}>{lot.name} — {lot.localidade}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" style={{ fontSize: '0.65rem' }} />
            </div>
            {errors.parkingLotId && (
              <p className="text-error mt-1.5 flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                    <i className="fas fa-circle-exclamation" />
                    {errors.parkingLotId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'zone' as const, label: 'Zona / Piso', placeholder: 'Ex: Piso -1, Zona A' },
              { key: 'spotNumber' as const, label: 'Número do Lugar', placeholder: 'Ex: A-07, MR-02' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label htmlFor={`${key}-input`} className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.82rem' }}>
                  {label} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  id={`${key}-input`}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => onChange({ [key]: e.target.value })}
                  className={`${inputBase} ${errors[key] ? inputError : ''}`}
                  style={{ fontSize: '0.9rem' }}
                  aria-invalid={!!errors[key]}
                />
                {errors[key] && (
                  <p className="text-error mt-1.5 flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                    <i className="fas fa-circle-exclamation" />
                    {errors[key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-foreground flex items-center gap-2 mb-4" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-clipboard-list text-primary" style={{ fontSize: '0.7rem' }} />
            </span>
            Tipo de Infração <span className="text-error">*</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {violationTypes.map((type) => {
              const isSelected = form.violationType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onChange({ violationType: type.id })}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected ? 'border-primary bg-primary/8 shadow-sm' : 'border-border bg-background hover:border-primary/40 hover:bg-primary/4'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary' : 'bg-muted'}`}>
                      <i className={`fas ${type.icon}`} style={{ fontSize: '0.85rem', color: isSelected ? 'white' : undefined }} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={`font-semibold leading-snug ${isSelected ? 'text-primary' : 'text-foreground'}`} style={{ fontSize: '0.8rem' }}>
                        {type.label}
                      </p>
                      <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem' }}>{type.description}</p>
                    </div>
                    {isSelected && <i className="fas fa-circle-check text-primary flex-shrink-0 mt-0.5" style={{ fontSize: '1rem' }} />}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.violationType && (
            <p className="text-error mt-3 flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-circle-exclamation" />
              {errors.violationType}
            </p>
          )}
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-foreground flex items-center gap-2 mb-4" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
            <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-comment-dots text-primary" style={{ fontSize: '0.7rem' }} />
            </span>
            Detalhes
          </h2>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="vehicle-plate-input" className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>
                <i className="fas fa-car text-primary/70 mr-1.5" />Matrícula do Veículo
              </label>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium" style={{ fontSize: '0.68rem' }}>Opcional</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                id="vehicle-plate-input"
                placeholder="Ex: 22-AB-44"
                value={form.vehiclePlate}
                onChange={(e) => { onChange({ vehiclePlate: e.target.value.toUpperCase() }); setPlateInfo(null); }}
                className={`${inputBase} font-mono tracking-widest flex-1`}
                style={{ fontSize: '0.9rem' }}
                maxLength={10}
              />
              <button
                type="button"
                onClick={lookupPlate}
                disabled={!form.vehiclePlate.trim() || lookingUp}
                className="flex-shrink-0 px-4 py-3 rounded-xl bg-primary text-white font-semibold text-sm transition-all disabled:opacity-40 hover:bg-primary/90"
              >
                {lookingUp ? <i className="fas fa-spinner fa-spin" /> : 'Verificar'}
              </button>
            </div>
            {!!(plateInfo && (plateInfo.make || plateInfo.model || plateInfo.color || plateInfo.imageUrl)) && (
              <div className="mt-2 px-3 py-2 rounded-xl bg-primary/6 border border-primary/20">
                {plateInfo.imageUrl && (
                  <img src={plateInfo.imageUrl} alt="Veículo identificado" className="w-full h-24 object-cover rounded-lg border border-border mb-2" />
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                {plateInfo.make && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Marca: </span>{plateInfo.make}</span>}
                {plateInfo.model && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Modelo: </span>{plateInfo.model}</span>}
                {(plateInfo.yearFrom || plateInfo.plateDate) && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Ano: </span>{plateInfo.yearFrom ?? plateInfo.plateDate?.slice(0, 4)}</span>}
                {plateInfo.yearTo && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Até: </span>{plateInfo.yearTo}</span>}
                {plateInfo.bodyType && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Carroceria: </span>{plateInfo.bodyType}</span>}
                {plateInfo.powerKw && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Potência: </span>{plateInfo.powerKw} kW</span>}
                {plateInfo.displacementCc && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Cilindrada: </span>{plateInfo.displacementCc} cc</span>}
                {plateInfo.color && <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}><span className="text-muted-foreground">Cor: </span>{plateInfo.color}</span>}
                </div>
              </div>
            )}
            <p className="text-muted-foreground mt-1.5" style={{ fontSize: '0.75rem' }}>Se conseguir visualizar a matrícula, por favor indique-a.</p>
          </div>

          <div>
            <label htmlFor="description-input" className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.82rem' }}>
              <i className="fas fa-align-left text-primary/70 mr-1.5" />Descrição da Situação <span className="text-error">*</span>
            </label>
            <textarea
              id="description-input"
              placeholder="Descreva o que observou. Ex: Veículo preto sem dístico estacionado no lugar MR-02 desde as 14h00..."
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={4}
              maxLength={500}
              className={`${inputBase} resize-none ${errors.description ? inputError : ''}`}
              style={{ fontSize: '0.9rem' }}
              aria-invalid={!!errors.description}
            />
            <div className="flex items-center justify-between mt-1.5">
              {errors.description ? (
                <p className="text-error flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-circle-exclamation" />
                  {errors.description}
                </p>
              ) : <span />}
              <span className={`text-right ${form.description.length >= 450 ? 'text-warning' : 'text-muted-foreground'}`} style={{ fontSize: '0.72rem' }}>
                {form.description.length}/500
              </span>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground flex items-center gap-2" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-camera text-primary" style={{ fontSize: '0.7rem' }} />
              </span>
              Fotografia
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium" style={{ fontSize: '0.68rem' }}>Opcional</span>
          </div>
          <label className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center bg-muted/30 hover:bg-primary/4 transition-all cursor-pointer group block">
            <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-cloud-arrow-up text-muted-foreground group-hover:text-primary transition-colors" style={{ fontSize: '1.3rem' }} />
            </div>
            {form.photo ? (
              <p className="text-primary font-semibold" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-check-circle mr-1.5" />{form.photo.name}
              </p>
            ) : (
              <p className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>Clique para adicionar fotografia</p>
            )}
            <p className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>PNG, JPG até 10 MB</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                onChange({ photo: file });
              }}
            />
          </label>
        </section>
      </div>

      {submitError && (
        <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-error/10 border border-error/30">
          <i className="fas fa-circle-exclamation text-error mt-0.5 flex-shrink-0" style={{ fontSize: '0.85rem' }} />
          <p className="text-error" style={{ fontSize: '0.82rem' }}>{submitError}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors flex-1 order-2 sm:order-1 disabled:opacity-50"
          style={{ fontSize: '0.9rem' }}
        >
          <i className="fas fa-times" />Cancelar
        </button>
        <button
          onClick={() => { if (validate()) void onSubmit(); }}
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex-1 order-1 sm:order-2 disabled:opacity-60"
          style={{ fontSize: '0.9rem' }}
        >
          {submitting ? (
            <><i className="fas fa-spinner fa-spin" />A enviar...</>
          ) : (
            <><i className="fas fa-paper-plane" />Enviar Denúncia</>
          )}
        </button>
      </div>

      <div className="mt-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-muted/40 border border-border/60">
        <i className="fas fa-lock text-muted-foreground mt-0.5 flex-shrink-0" style={{ fontSize: '0.8rem' }} />
        <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
          <span className="font-semibold text-foreground">Privacidade: </span>
          Os seus dados são tratados de forma confidencial e apenas partilhados com a equipa de gestão para resolução da situação, em conformidade com o RGPD.
        </p>
      </div>
    </div>
  );
}
