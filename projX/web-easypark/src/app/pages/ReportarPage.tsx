import { useNavigate, useSearchParams } from 'react-router';
import { mockParkingLots } from '../data/parkingData';
import { lookupVehicleData, type VehicleData } from '../../services/vehicleLookup';

// ── Types ─────────────────────────────────────────────────────────────────────
type ReportStep = 1 | 2;
type ViolationType = 'accessible' | 'reserved' | 'ev' | 'double-parked' | 'blocking' | 'other';

interface ReportForm {
  parkingLotId: string;
  zone: string;
  spotNumber: string;
  violationType: ViolationType;
  vehiclePlate: string;
  description: string;
}

// ── Violation Types ───────────────────────────────────────────────────────────
const violationTypes: { id: ViolationType; label: string; icon: string; description: string; color: string }[] = [
  {
    id: 'accessible',
    label: 'Lugar de Mobilidade Reduzida',
    icon: 'fa-wheelchair',
    description: 'Veículo sem dístico a ocupar lugar para pessoas com mobilidade reduzida',
    color: 'text-blue-500',
  },
  {
    id: 'reserved',
    label: 'Lugar Reservado',
    icon: 'fa-bookmark',
    description: 'Veículo sem autorização em lugar reservado',
    color: 'text-violet-500',
  },
  {
    id: 'ev',
    label: 'Lugar de Carregamento EV',
    icon: 'fa-charging-station',
    description: 'Veículo não elétrico a ocupar lugar de carregamento',
    color: 'text-green-500',
  },
  {
    id: 'double-parked',
    label: 'Estacionamento em Dupla Fila',
    icon: 'fa-car-side',
    description: 'Veículo estacionado em fila dupla a bloquear outros',
    color: 'text-orange-500',
  },
  {
    id: 'blocking',
    label: 'A Bloquear Acesso',
    icon: 'fa-ban',
    description: 'Veículo a bloquear entrada, saída ou circulação',
    color: 'text-red-500',
  },
  {
    id: 'other',
    label: 'Outra Infração',
    icon: 'fa-triangle-exclamation',
    description: 'Outro tipo de estacionamento não autorizado',
    color: 'text-yellow-500',
  },
];

// ── Shared input/label styles ──────────────────────────────────────────────────
const inputBase =
  'w-full rounded-xl px-4 py-3 bg-card border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';
const inputError = 'border-error focus:ring-error/40 focus:border-error';

// ── Step 1: Report Form ───────────────────────────────────────────────────────
interface Step1Props {
  form: ReportForm;
  onChange: (updates: Partial<ReportForm>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function Step1({ form, onChange, onSubmit, onCancel }: Step1Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plateInfo, setPlateInfo] = useState<VehicleData | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const parkingLots = mockParkingLots;

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

  const handleSubmit = () => {
    if (validate()) onSubmit();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
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

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6 bg-primary/8 border border-primary/25">
        <i className="fas fa-shield-halved text-primary mt-0.5 flex-shrink-0" style={{ fontSize: '1rem' }} />
        <div>
          <p className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>
            Denúncia rápida e anónima
          </p>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.8rem' }}>
            As suas denúncias ajudam a equipa a atuar e a garantir que os lugares especiais estão disponíveis para quem precisa.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Secção: Localização ─────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2
            className="text-foreground flex items-center gap-2 mb-4"
            style={{ fontSize: '0.9rem', fontWeight: 700 }}
          >
            <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-location-dot text-primary" style={{ fontSize: '0.7rem' }} />
            </span>
            Localização
          </h2>

          {/* Parque */}
          <div className="mb-4">
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.82rem' }}>
              Parque de Estacionamento <span className="text-error">*</span>
            </label>
            <div className="relative">
              <i
                className="fas fa-map-marker-alt absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none"
                style={{ fontSize: '0.8rem' }}
              />
              <select
                value={form.parkingLotId}
                onChange={(e) => onChange({ parkingLotId: e.target.value })}
                className={`${inputBase} pl-9 pr-8 appearance-none ${errors.parkingLotId ? inputError : ''}`}
                style={{ fontSize: '0.9rem' }}
                aria-invalid={!!errors.parkingLotId}
              >
                <option value="">Selecione o parque...</option>
                {parkingLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} — {lot.localidade}
                  </option>
                ))}
              </select>
              <i
                className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                style={{ fontSize: '0.65rem' }}
              />
            </div>
            {errors.parkingLotId && (
              <p className="text-error mt-1.5 flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <i className="fas fa-circle-exclamation" />
                {errors.parkingLotId}
              </p>
            )}
          </div>

          {/* Zona + Número */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.82rem' }}>
                Zona / Piso <span className="text-error">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Piso -1, Zona A"
                value={form.zone}
                onChange={(e) => onChange({ zone: e.target.value })}
                className={`${inputBase} ${errors.zone ? inputError : ''}`}
                style={{ fontSize: '0.9rem' }}
                aria-invalid={!!errors.zone}
              />
              {errors.zone && (
                <p className="text-error mt-1.5 flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-circle-exclamation" />
                  {errors.zone}
                </p>
              )}
            </div>
            <div>
              <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.82rem' }}>
                Número do Lugar <span className="text-error">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: A-07, MR-02"
                value={form.spotNumber}
                onChange={(e) => onChange({ spotNumber: e.target.value })}
                className={`${inputBase} ${errors.spotNumber ? inputError : ''}`}
                style={{ fontSize: '0.9rem' }}
                aria-invalid={!!errors.spotNumber}
              />
              {errors.spotNumber && (
                <p className="text-error mt-1.5 flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-circle-exclamation" />
                  {errors.spotNumber}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Secção: Tipo de Infração ─────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2
            className="text-foreground flex items-center gap-2 mb-4"
            style={{ fontSize: '0.9rem', fontWeight: 700 }}
          >
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
                    isSelected
                      ? 'border-primary bg-primary/8 shadow-sm'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-primary/4'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <i
                        className={`fas ${type.icon}`}
                        style={{
                          fontSize: '0.85rem',
                          color: isSelected ? 'white' : undefined,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p
                        className={`font-semibold leading-snug ${isSelected ? 'text-primary' : 'text-foreground'}`}
                        style={{ fontSize: '0.8rem' }}
                      >
                        {type.label}
                      </p>
                      <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem' }}>
                        {type.description}
                      </p>
                    </div>
                    {isSelected && (
                      <i className="fas fa-circle-check text-primary flex-shrink-0 mt-0.5" style={{ fontSize: '1rem' }} />
                    )}
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

        {/* ── Secção: Detalhes ─────────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <h2
            className="text-foreground flex items-center gap-2 mb-4"
            style={{ fontSize: '0.9rem', fontWeight: 700 }}
          >
            <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-comment-dots text-primary" style={{ fontSize: '0.7rem' }} />
            </span>
            Detalhes
          </h2>

          {/* Matrícula */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>
                <i className="fas fa-car text-primary/70 mr-1.5" />
                Matrícula do Veículo
              </label>
              <span
                className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                style={{ fontSize: '0.68rem' }}
              >
                Opcional
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
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
            {plateInfo && (plateInfo.make || plateInfo.model || plateInfo.color) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 rounded-xl bg-primary/6 border border-primary/20">
                {plateInfo.make && (
                  <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}>
                    <span className="text-muted-foreground">Marca: </span>{plateInfo.make}
                  </span>
                )}
                {plateInfo.model && (
                  <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}>
                    <span className="text-muted-foreground">Modelo: </span>{plateInfo.model}
                  </span>
                )}
                {plateInfo.plateDate && (
                  <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}>
                    <span className="text-muted-foreground">Ano: </span>{plateInfo.plateDate.slice(0, 4)}
                  </span>
                )}
                {plateInfo.color && (
                  <span className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}>
                    <span className="text-muted-foreground">Cor: </span>{plateInfo.color}
                  </span>
                )}
              </div>
            )}
            <p className="text-muted-foreground mt-1.5" style={{ fontSize: '0.75rem' }}>
              Se conseguir visualizar a matrícula, por favor indique-a.
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.82rem' }}>
              <i className="fas fa-align-left text-primary/70 mr-1.5" />
              Descrição da Situação <span className="text-error">*</span>
            </label>
            <textarea
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
              ) : (
                <span />
              )}
              <span
                className={`text-right ${form.description.length >= 450 ? 'text-warning' : 'text-muted-foreground'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {form.description.length}/500
              </span>
            </div>
          </div>
        </section>

        {/* ── Secção: Fotografia ───────────────────────────────────── */}
        <section className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-foreground flex items-center gap-2"
              style={{ fontSize: '0.9rem', fontWeight: 700 }}
            >
              <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-camera text-primary" style={{ fontSize: '0.7rem' }} />
              </span>
              Fotografia
            </h2>
            <span
              className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
              style={{ fontSize: '0.68rem' }}
            >
              Opcional
            </span>
          </div>
          <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center bg-muted/30 hover:bg-primary/4 transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center mx-auto mb-3">
              <i
                className="fas fa-cloud-arrow-up text-muted-foreground group-hover:text-primary transition-colors"
                style={{ fontSize: '1.3rem' }}
              />
            </div>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>
              Clique para adicionar fotografia
            </p>
            <p className="text-muted-foreground mt-1" style={{ fontSize: '0.75rem' }}>
              PNG, JPG até 5 MB
            </p>
          </div>
        </section>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors flex-1 order-2 sm:order-1"
          style={{ fontSize: '0.9rem' }}
        >
          <i className="fas fa-times" />
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex-1 order-1 sm:order-2"
          style={{ fontSize: '0.9rem' }}
        >
          <i className="fas fa-paper-plane" />
          Enviar Denúncia
        </button>
      </div>

      {/* RGPD */}
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

// ── Step 2: Confirmation ──────────────────────────────────────────────────────
interface Step2Props {
  reportId: string;
  form: ReportForm;
  onViewReports: () => void;
  onNewReport: () => void;
  onGoHome: () => void;
}

function Step2({ reportId, form, onViewReports, onNewReport, onGoHome }: Step2Props) {
  const selectedLot = mockParkingLots.find((p) => p.id === form.parkingLotId);
  const violationType = violationTypes.find((v) => v.id === form.violationType);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Ícone de sucesso */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
              <i className="fas fa-check text-success" style={{ fontSize: '2rem' }} />
            </div>
            <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <i className="fas fa-flag text-white" style={{ fontSize: '0.7rem' }} />
            </span>
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-6">
          <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            Denúncia Enviada!
          </h1>
          <p className="text-muted-foreground mt-1.5" style={{ fontSize: '0.875rem' }}>
            A sua denúncia foi registada. A equipa de gestão irá analisar e atuar em conformidade.
          </p>
        </div>

        {/* Resumo */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5 shadow-sm">
          {/* Cabeçalho do card */}
          <div className="bg-primary/8 border-b border-border px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className={`fas ${violationType?.icon} text-primary`} style={{ fontSize: '1rem' }} />
            </div>
            <div className="flex-1">
              <p className="text-foreground font-bold" style={{ fontSize: '0.9rem' }}>
                {violationType?.label}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                Referência #{reportId}
              </p>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 text-warning border border-warning/30" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              <i className="fas fa-hourglass-half" style={{ fontSize: '0.6rem' }} />
              Em análise
            </span>
          </div>

          {/* Detalhes */}
          <div className="px-5 py-4 space-y-3.5">
            <DetailRow icon="fa-location-dot" label="Local">
              {selectedLot?.name} — {form.zone}, Lugar {form.spotNumber}
            </DetailRow>
            {form.vehiclePlate && (
              <DetailRow icon="fa-car" label="Matrícula">
                <span className="font-mono tracking-widest">{form.vehiclePlate}</span>
              </DetailRow>
            )}
            <DetailRow icon="fa-clock" label="Data e Hora">
              {new Date().toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </DetailRow>
          </div>
        </div>

        {/* Próximos passos */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h3 className="text-foreground flex items-center gap-2 mb-3.5" style={{ fontSize: '0.875rem', fontWeight: 700 }}>
            <i className="fas fa-lightbulb text-primary" />
            Próximos Passos
          </h3>
          <ul className="space-y-2.5">
            {[
              { icon: 'fa-circle-check', color: 'text-success', text: 'A equipa de gestão recebeu a sua denúncia' },
              { icon: 'fa-magnifying-glass', color: 'text-primary', text: 'Verificação no local nas próximas 2 horas' },
              { icon: 'fa-gavel', color: 'text-warning', text: 'Se confirmada, serão tomadas medidas apropriadas' },
              { icon: 'fa-bell', color: 'text-info', text: 'Receberá notificação quando o estado for atualizado' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <i className={`fas ${item.icon} ${item.color} mt-0.5 flex-shrink-0`} style={{ fontSize: '0.8rem' }} />
                <span className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Botões */}
        <div className="space-y-2.5">
          <button
            onClick={onViewReports}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
            style={{ fontSize: '0.9rem' }}
          >
            <i className="fas fa-list" />
            Ver as Minhas Denúncias
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onNewReport}
              className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary/8 transition-colors"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-plus" />
              Nova Denúncia
            </button>
            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-2 py-3 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-house" />
              Início
            </button>
          </div>
        </div>

        <p className="text-center text-muted-foreground mt-5" style={{ fontSize: '0.75rem' }}>
          Dúvidas?{' '}
          <a href="mailto:suporte@easyspot.pt" className="text-primary font-semibold hover:underline">
            suporte@easyspot.pt
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Componente auxiliar de linha de detalhe ────────────────────────────────────
function DetailRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <i className={`fas ${icon} text-muted-foreground mt-0.5 w-4 flex-shrink-0`} style={{ fontSize: '0.8rem' }} />
      <div className="flex-1">
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{label}</p>
        <p className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>{children}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ReportarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<ReportStep>(1);
  const [reportId, setReportId] = useState<string>('');
  const [form, setForm] = useState<ReportForm>({
    parkingLotId: searchParams.get('parkId') || '',
    zone: '',
    spotNumber: '',
    violationType: '' as ViolationType,
    vehiclePlate: '',
    description: '',
  });

  const updateForm = (updates: Partial<ReportForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = () => {
    const id = `REP${Date.now().toString().slice(-6)}`;
    setReportId(id);
    setStep(2);
  };

  const handleNewReport = () => {
    setForm({
      parkingLotId: '',
      zone: '',
      spotNumber: '',
      violationType: '' as ViolationType,
      vehiclePlate: '',
      description: '',
    });
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {step === 1 && (
        <Step1
          form={form}
          onChange={updateForm}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      )}
      {step === 2 && (
        <Step2
          reportId={reportId}
          form={form}
          onViewReports={() => navigate('/denuncias')}
          onNewReport={handleNewReport}
          onGoHome={() => navigate('/')}
        />
      )}
    </div>
  );
}