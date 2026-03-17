import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { useProfile, type DriverType, type AccountType } from '../context/ProfileContext';
import { lookupVehicleData, lookupInsuranceData, type VehicleData, type InsuranceData } from '../../services/vehicleLookup';

type ModalMode = 'login' | 'register' | null;

const PT_PLATE_REGEX = /^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/;

function VehicleFieldGroup({ label, fields }: { label?: string; fields: { label: string; value: string | undefined }[] }) {
  const visible = fields.filter((f) => f.value?.trim());
  if (visible.length === 0) return null;
  return (
    <div>
      {label && <p className="text-muted-foreground font-semibold mb-1.5" style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {visible.map((f) => (
          <div key={f.label}>
            <p className="text-muted-foreground" style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</p>
            <p className="text-foreground font-semibold" style={{ fontSize: '0.8rem' }}>{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dados estáticos ───────────────────────────────────────────────────────────
const features = [
  { icon: 'fa-satellite-dish', title: 'Sensores em Tempo Real', desc: 'Infravermelhos e LEDs em cada lugar. Disponibilidade atualizada ao segundo.' },
  { icon: 'fa-id-card',        title: 'Identificação Automática', desc: 'Leitura de matrícula por OCR e identificador RFID na entrada.' },
  { icon: 'fa-charging-station', title: 'Carregamento EV', desc: 'Localize carregadores compatíveis, veja velocidade e preço por kWh em tempo real.' },
  { icon: 'fa-wheelchair',     title: 'Acessibilidade Total', desc: 'Dimensões dos lugares, distância à entrada e vigilância para mobilidade reduzida.' },
  { icon: 'fa-euro-sign',      title: 'Cobrança Inteligente', desc: 'Faturação automática via Stripe com histórico, comparação de custos e alertas.' },
  { icon: 'fa-chart-line',     title: 'Dashboard de Gestão', desc: 'Ocupação, receita, saúde dos sensores e relatórios exportáveis para operadores.' },
];

const personas = [
  { icon: 'fa-car', color: '#7357ec', bg: 'rgba(115,87,236,0.1)', title: 'Condutor Regular', desc: 'Encontre o parque ideal em segundos. Veja lugares livres, preços e reserve com antecedência.' },
  { icon: 'fa-bolt', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', title: 'Condutor EV', desc: 'Garanta um carregador compatível antes de sair. Acompanhe a carga em tempo real.' },
  { icon: 'fa-wheelchair', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', title: 'Mobilidade Reduzida', desc: 'Filtre lugares acessíveis, veja dimensões exatas e distâncias à entrada. Vigiado e monitorizado.' },
  { icon: 'fa-chart-bar', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', title: 'Gestor / Técnico', desc: 'Dashboard de operações, relatórios de receita, saúde dos sensores e ordens de manutenção.' },
];

const steps = [
  { n: '1', icon: 'fa-user-plus',    title: 'Crie a sua conta',        desc: 'Registe-se com e-mail ou SSO (Google, Microsoft). Secure via Authentik.' },
  { n: '2', icon: 'fa-car-side',     title: 'Associe o seu veículo',   desc: 'Adicione a matrícula ou identifique-se por RFID Via Verde.' },
  { n: '3', icon: 'fa-credit-card',  title: 'Configure o pagamento',   desc: 'Ligue o seu Stripe, cartão ou MB Way. Cobrança automática à saída.' },
];

const stats = [
  { value: '10+',  label: 'Parques parceiros' },
  { value: '98%',  label: 'Precisão dos sensores' },
  { value: '<2s',  label: 'Atualização em tempo real' },
];

// ── Componente principal ──────────────────────────────────────────────────────
export function WelcomePage() {
  const navigate = useNavigate();
  const { setDriverType, setAccountType: saveAccountType } = useProfile();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [onboardStep, setOnboardStep] = useState(0);
  const [accountType, setAccountType] = useState<AccountType>('condutor');

  const openRegister = () => { setModalMode('register'); };
  const openLogin    = () => { setModalMode('login'); };
  const closeModal   = () => { setModalMode(null); };

  const startOnboarding = () => {
    setModalMode(null);
    setOnboardStep(1);
  };

  const finishOnboarding = (dt: DriverType, at: AccountType) => {
    setDriverType(dt);
    saveAccountType(at);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <i className="fas fa-square-parking text-primary-foreground" style={{ fontSize: '0.9rem' }} />
            </div>
            <span className="text-foreground font-extrabold" style={{ fontSize: '1.1rem' }}>
              Easy<span className="text-primary">Spot</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openLogin}
              className="px-4 py-2 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              style={{ fontSize: '0.85rem' }}
            >
              Entrar
            </button>
            <button
              onClick={openRegister}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/25"
              style={{ fontSize: '0.85rem' }}
            >
              Criar conta
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        className="relative pt-14 min-h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2e1c7c 0%, #5948a6 40%, #7357ec 100%)' }}
      >
        {/* Imagem de fundo com overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1518376939577-af724b358f40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        />
        {/* Círculos decorativos */}
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a99be8 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center py-20">
          {/* Badge */}


          <h1 className="text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1 }}>
            Estacione sem stress,<br />
            <span style={{ color: '#c4baf0' }}>pague só o que usa.</span>
          </h1>
          <p className="text-white/75 mb-8 max-w-xl mx-auto" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)' }}>
            Disponibilidade em tempo real, carregadores EV, lugares acessíveis e cobrança automática. Tudo numa só app.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <button
              onClick={openRegister}
              className="px-7 py-3.5 rounded-full bg-white text-primary font-extrabold hover:bg-white/90 shadow-xl transition-all active:scale-[0.98]"
              style={{ fontSize: '0.95rem' }}
            >
              <i className="fas fa-rocket mr-2" />
              Começar gratuitamente
            </button>
            <button
              onClick={openLogin}
              className="px-7 py-3.5 rounded-full border-2 border-white/40 text-white font-semibold hover:bg-white/10 transition-all"
              style={{ fontSize: '0.95rem' }}
            >
              <i className="fas fa-sign-in-alt mr-2" />
              Já tenho conta
            </button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {stats.map((s) => (
              null
            ))}
          </div>
        </div>

        {/* Ondas de transição */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ height: 60 }}>
            <path d="M0 60L1440 60L1440 20C1200 60 240 0 0 40L0 60Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* ── Para quem? ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-primary font-bold uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            <i className="fas fa-users mr-2" />Personas
          </p>
          <h2 className="text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>
            Feito para todos
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto" style={{ fontSize: '0.9rem' }}>
            Seja condutor, motorista EV, utilizador com mobilidade reduzida ou gestor de parques — o EasySpot adapta-se às suas necessidades.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {personas.map((p) => (
            <div key={p.title} className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: p.bg }}>
                <i className={`fas ${p.icon}`} style={{ color: p.color, fontSize: '1.2rem' }} />
              </div>
              <h3 className="text-foreground font-bold mb-1.5" style={{ fontSize: '0.95rem' }}>{p.title}</h3>
              <p className="text-muted-foreground" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Funcionalidades ────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-primary font-bold uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>
              <i className="fas fa-microchip mr-2" />Tecnologia
            </p>
            <h2 className="text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>
              Infraestrutura inteligente
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-2xl p-5 flex gap-4 hover:shadow-md hover:border-primary/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className={`fas ${f.icon} text-primary`} style={{ fontSize: '0.95rem' }} />
                </div>
                <div>
                  <h3 className="text-foreground font-bold mb-1" style={{ fontSize: '0.875rem' }}>{f.title}</h3>
                  <p className="text-muted-foreground" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-primary font-bold uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            <i className="fas fa-list-ol mr-2" />Primeiros passos
          </p>
          <h2 className="text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>
            Pronto em 3 minutos
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-col items-center text-center relative">
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-6 left-1/2 w-full border-t-2 border-dashed border-primary/20 translate-x-1/4" />
              )}
              <div className="relative w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/25 z-10">
                <i className={`fas ${s.icon} text-primary-foreground`} style={{ fontSize: '1.2rem' }} />
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-extrabold"
                  style={{ fontSize: '0.65rem' }}
                >{s.n}</span>
              </div>
              <h3 className="text-foreground font-bold mb-1.5" style={{ fontSize: '0.9rem' }}>{s.title}</h3>
              <p className="text-muted-foreground" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-10 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #2e1c7c 0%, #7357ec 100%)' }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <i className="fas fa-square-parking text-white/20 absolute bottom-4 left-6" style={{ fontSize: '5rem' }} />
          <div className="relative z-10">
            <h2 className="text-white mb-3" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800 }}>
              Comece agora. É gratuito.
            </h2>
            <p className="text-white/75 mb-7" style={{ fontSize: '0.9rem' }}>
              Sem compromisso. Configure a sua conta em menos de 3 minutos e estacione de forma mais inteligente.
            </p>
            <button
              onClick={openRegister}
              className="px-8 py-3.5 rounded-full bg-white font-extrabold hover:bg-white/90 transition-all shadow-xl active:scale-[0.98]"
              style={{ fontSize: '0.95rem', color: '#7357ec' }}
            >
              <i className="fas fa-arrow-right mr-2" />
              Criar conta gratuita
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <i className="fas fa-square-parking text-primary-foreground" style={{ fontSize: '0.65rem' }} />
            </div>
            <span className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>Easy<span className="text-primary">Spot</span></span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
            © 2026 EasySpot · <a href="mailto:suporte@easyspot.pt" className="text-primary hover:underline">suporte@easyspot.pt</a> · Conformidade RGPD
          </p>
          <div className="flex gap-3">
            {['fa-shield-halved', 'fa-file-contract', 'fa-envelope'].map((ic) => (
              <button key={ic} className="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 transition-colors flex items-center justify-center">
                <i className={`fas ${ic} text-muted-foreground`} style={{ fontSize: '0.75rem' }} />
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Modal de Autenticação ───────────────────────────────────────── */}
      {modalMode && (
        <AuthModal
          mode={modalMode}
          onClose={closeModal}
          onSwitchMode={setModalMode}
          onSuccess={startOnboarding}
        />
      )}

      {/* ── Modal de Onboarding ─────────────────────────────────────────── */}
      {onboardStep > 0 && (
        <OnboardingModal
          step={onboardStep}
          accountType={accountType}
          onSetAccountType={setAccountType}
          onNext={() => setOnboardStep((s) => s + 1)}
          onBack={() => setOnboardStep((s) => Math.max(1, s - 1))}
          onFinish={finishOnboarding}
          onClose={() => setOnboardStep(0)}
        />
      )}
    </div>
  );
}

// ── Modal de Autenticação ─────────────────────────────────────────────────────
function AuthModal({
  mode,
  onClose,
  onSwitchMode,
  onSuccess,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSwitchMode: (m: ModalMode) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);

  const inputCls = 'w-full rounded-xl px-4 py-3 bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-border">
          <div>
            <p className="text-foreground font-extrabold" style={{ fontSize: '1.1rem' }}>
              {mode === 'login' ? 'Bem-vindo de volta!' : 'Criar conta'}
            </p>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.78rem' }}>
              {mode === 'login' ? 'Aceda à sua conta EasySpot' : 'Registe-se gratuitamente'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors">
            <i className="fas fa-times text-muted-foreground" style={{ fontSize: '0.8rem' }} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {/* SSO via Authentik */}
          <button
            onClick={onSuccess}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <i className="fas fa-shield-halved text-primary-foreground" style={{ fontSize: '0.65rem' }} />
            </div>
            <span className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>
              {mode === 'login' ? 'Entrar' : 'Registar'} com Authentik SSO
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>ou com e-mail</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          {mode === 'register' && (
            <div>
              <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Nome completo</label>
              <input
                type="text" placeholder="Ex: Filipe Teixeira" value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls} style={{ fontSize: '0.875rem' }}
              />
            </div>
          )}
          <div>
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>E-mail</label>
            <input
              type="email" placeholder="utilizador@exemplo.pt" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls} style={{ fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Palavra-passe</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-10`} style={{ fontSize: '0.875rem' }}
              />
              <button
                type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.8rem' }} />
              </button>
            </div>
          </div>
          {mode === 'login' && (
            <div className="text-right">
              <button className="text-primary font-semibold" style={{ fontSize: '0.78rem' }}>Esqueci-me da palavra-passe</button>
            </div>
          )}

          <button
            onClick={onSuccess}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 shadow-md shadow-primary/20 transition-all active:scale-[0.98] mt-1"
            style={{ fontSize: '0.9rem' }}
          >
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
            <i className="fas fa-arrow-right ml-2" />
          </button>

          <p className="text-center text-muted-foreground" style={{ fontSize: '0.78rem' }}>
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="text-primary font-semibold hover:underline"
            >
              {mode === 'login' ? 'Registe-se' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Onboarding ───────────────────────────────────────────────────────
function OnboardingModal({
  step, accountType, onSetAccountType, onNext, onBack, onFinish, onClose,
}: {
  step: number;
  accountType: AccountType;
  onSetAccountType: (t: AccountType) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: (dt: DriverType, at: AccountType) => void;
  onClose: () => void;
}) {
  const [plate, setPlate] = useState('');
  const [rfid, setRfid] = useState('');
  const [plateLoading, setPlateLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [manualVehicleData, setManualVehicleData] = useState<Partial<VehicleData>>({});
  const [showManualVehicleForm, setShowManualVehicleForm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [payMethod, setPayMethod] = useState<'card' | 'mbway' | 'mb'>('card');
  const [cardN, setCardN] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [phone, setPhone] = useState('');
  const [driverType, setDriverTypeLocal] = useState<DriverType>('regular');
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // ── Lookup automático ao inserir matrícula ───────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!PT_PLATE_REGEX.test(plate)) {
      setVehicleData(null);
      setInsuranceData(null);
      setPlateError(null);
      setShowManualVehicleForm(false);
      setManualVehicleData({});
      return;
    }

    setPlateLoading(true);
    setVehicleData(null);
    setInsuranceData(null);
    setPlateError(null);
    setShowManualVehicleForm(false);

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await lookupVehicleData(plate);

        if (!data?.make && !data?.model) {
          const msg = 'Não foram encontrados dados para esta matrícula.';
          setPlateError(msg);
          toast.warning(msg, { description: `Matrícula: ${plate}` });
          return;
        }

        setVehicleData(data);
        toast.success('Veículo identificado com sucesso!', { description: [data.make, data.model].filter(Boolean).join(' ') || plate });

        const insurance = await lookupInsuranceData(plate);
        setInsuranceData(insurance);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro inesperado ao consultar a matrícula.';
        setPlateError(msg);
        setShowManualVehicleForm(true);
        toast.error(msg, { description: `Matrícula: ${plate}` });
      } finally {
        setPlateLoading(false);
      }
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [plate]);

  // Total de steps consoante tipo de conta
  const totalSteps = accountType === 'condutor' ? 5 : 3;

  const inputCls = 'w-full rounded-xl px-4 py-3 bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

  const renderStep = () => {
    // ── Step 1: Tipo de conta ────────────────────────────────────────────
    if (step === 1) return (
      <div className="space-y-3">
        <p className="text-muted-foreground mb-4" style={{ fontSize: '0.82rem' }}>
          Selecione o tipo de conta para personalizar a sua experiência.
        </p>
        {([
          { id: 'condutor', icon: 'fa-car', label: 'Condutor', desc: 'Encontrar parques, reservar, gerir custos' },
          { id: 'gestor',   icon: 'fa-chart-pie', label: 'Gestor de Parques', desc: 'Dashboard, receitas, sensores, relatórios' },
          { id: 'tecnico',  icon: 'fa-wrench', label: 'Técnico de Manutenção', desc: 'Diagnóstico, ordens de manutenção, sensores' },
        ] as { id: AccountType; icon: string; label: string; desc: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => onSetAccountType(t.id)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              accountType === t.id ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/40'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accountType === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <i className={`fas ${t.icon}`} style={{ fontSize: '1rem' }} />
            </div>
            <div className="flex-1">
              <p className={`font-bold ${accountType === t.id ? 'text-primary' : 'text-foreground'}`} style={{ fontSize: '0.875rem' }}>{t.label}</p>
              <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>{t.desc}</p>
            </div>
            {accountType === t.id && <i className="fas fa-circle-check text-primary" />}
          </button>
        ))}
      </div>
    );

    // ── Step 2: Associar veículo (condutor) ou acesso (gestor/técnico) ───
    if (step === 2 && accountType === 'condutor') return (
      <div className="space-y-4">



        {/* Campo matrícula com indicador de estado */}
        <div>
          <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-car text-primary mr-1.5" />Matrícula do veículo <span className="text-error">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ex: 22-AB-44"
              value={plate}
              onChange={(e) => {
                const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                setPlate(raw);
              }}
              className={`${inputCls} font-mono tracking-widest uppercase pr-10`}
              style={{ fontSize: '0.9rem' }}
              maxLength={9}
              aria-label="Matrícula do veículo"
            />
            {/* Ícone de estado à direita */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {plateLoading && (
                <i className="fas fa-spinner fa-spin text-primary" style={{ fontSize: '0.9rem' }} aria-label="A consultar..." />
              )}
              {!plateLoading && vehicleData && (
                <i className="fas fa-circle-check text-success" style={{ fontSize: '0.9rem' }} aria-label="Veículo encontrado" />
              )}
              {!plateLoading && plateError && PT_PLATE_REGEX.test(plate) && (
                <i className="fas fa-circle-xmark text-error" style={{ fontSize: '0.9rem' }} aria-label="Erro na consulta" />
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-1" style={{ fontSize: '0.72rem' }}>
            Formato: XX-XX-XX (ex: 22-AB-44). A consulta é automática ao inserir a matrícula.
          </p>
        </div>

        {/* Card com dados do veículo (quando encontrado) */}
        {vehicleData && !plateLoading && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <i className="fas fa-circle-check text-success" style={{ fontSize: '0.85rem' }} />
              <p className="font-bold" style={{ fontSize: '0.82rem', color: '#22c55e' }}>Veículo identificado automaticamente</p>
            </div>

            <VehicleFieldGroup fields={[
              { label: 'Marca',       value: vehicleData.make },
              { label: 'Modelo',      value: vehicleData.model },
              { label: 'Ano',         value: vehicleData.plateDate?.split('/')[1] },
              { label: 'Cor',         value: vehicleData.color },
              { label: 'Combustível', value: vehicleData.fuelType },
              { label: 'Categoria',   value: vehicleData.categoryType },
            ]} />

            {insuranceData && (
              <VehicleFieldGroup label="Seguro" fields={[
                { label: 'Seguradora', value: insuranceData.entity },
                { label: 'Apólice',    value: insuranceData.policy },
                { label: 'Válido até', value: insuranceData.endDate?.split(' ')[0] },
              ]} />
            )}
          </div>
        )}

        {/* Mensagem de erro de lookup (apenas se matrícula válida) */}
        {plateError && !plateLoading && PT_PLATE_REGEX.test(plate) && (
          <div className="rounded-xl border border-error/30 bg-error/5 p-3.5 flex items-start gap-2.5">
            <i className="fas fa-triangle-exclamation text-error mt-0.5 flex-shrink-0" style={{ fontSize: '0.8rem' }} />
            <div>
              <p className="text-error font-semibold" style={{ fontSize: '0.78rem' }}>{plateError}</p>
              <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.72rem' }}>
                Pode continuar mesmo assim — a matrícula será verificada por OCR na entrada do parque.
              </p>
              <button
                type="button"
                onClick={() => setShowManualVehicleForm((prev) => !prev)}
                className="mt-2 text-primary font-semibold hover:underline"
                style={{ fontSize: '0.74rem' }}
              >
                {showManualVehicleForm ? 'Ocultar preenchimento manual' : 'Preencher dados do veículo manualmente'}
              </button>
            </div>
          </div>
        )}

        {showManualVehicleForm && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-3">
            <p className="text-foreground font-semibold" style={{ fontSize: '0.78rem' }}>
              Contorno temporário: introduza os dados manualmente enquanto a API externa está indisponível.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Marca"
                value={String(manualVehicleData.make || '')}
                onChange={(e) => setManualVehicleData((prev) => ({ ...prev, make: e.target.value }))}
                className={inputCls}
                style={{ fontSize: '0.8rem' }}
              />
              <input
                type="text"
                placeholder="Modelo"
                value={String(manualVehicleData.model || '')}
                onChange={(e) => setManualVehicleData((prev) => ({ ...prev, model: e.target.value }))}
                className={inputCls}
                style={{ fontSize: '0.8rem' }}
              />
              <input
                type="text"
                placeholder="Ano"
                value={String(manualVehicleData.year || '')}
                onChange={(e) => setManualVehicleData((prev) => ({ ...prev, year: e.target.value }))}
                className={inputCls}
                style={{ fontSize: '0.8rem' }}
              />
              <input
                type="text"
                placeholder="Combustível"
                value={String(manualVehicleData.fuel || '')}
                onChange={(e) => setManualVehicleData((prev) => ({ ...prev, fuel: e.target.value }))}
                className={inputCls}
                style={{ fontSize: '0.8rem' }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const hasAnyMainField =
                  String(manualVehicleData.make || '').trim() !== '' ||
                  String(manualVehicleData.model || '').trim() !== '';

                if (!hasAnyMainField) {
                  toast.warning('Preencha pelo menos Marca ou Modelo.');
                  return;
                }

                setVehicleData({ ...manualVehicleData, plate } as VehicleData);
                setPlateError(null);
                toast.success('Dados do veículo guardados manualmente.');
              }}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
              style={{ fontSize: '0.76rem' }}
            >
              Guardar dados manuais
            </button>
          </div>
        )}

        {/* Campo RFID Via Verde */}
        <div>
          <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-wifi text-primary mr-1.5" />Identificador RFID
            <span className="ml-1.5 text-muted-foreground font-normal" style={{ fontSize: '0.72rem' }}>(Opcional)</span>
          </label>
          <input
            type="text"
            placeholder="Ex: A3:F2:9C:B1"
            value={rfid}
            onChange={(e) => setRfid(e.target.value)}
            className={`${inputCls} font-mono`}
            style={{ fontSize: '0.875rem' }}
          />
        </div>


      </div>
    );

    if (step === 2 && accountType !== 'condutor') return (
      <div className="space-y-4">
        <p className="text-muted-foreground mb-2" style={{ fontSize: '0.82rem' }}>
          Configure o seu acesso à plataforma de {accountType === 'gestor' ? 'gestão' : 'manutenção'}.
        </p>
        <div>
          <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-building text-primary mr-1.5" />Código do parque / organização
          </label>
          <input type="text" placeholder="Ex: PARK-2026-ABC" className={inputCls} style={{ fontSize: '0.875rem' }} />
        </div>
        <div>
          <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-envelope text-primary mr-1.5" />E-mail de convite
          </label>
          <input type="email" placeholder="gestor@parque.pt" className={inputCls} style={{ fontSize: '0.875rem' }} />
        </div>
        <div className="p-3.5 rounded-xl bg-warning/8 border border-warning/25 flex items-start gap-2">
          <i className="fas fa-triangle-exclamation text-warning mt-0.5 flex-shrink-0" style={{ fontSize: '0.85rem' }} />
          <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
            O acesso de {accountType === 'gestor' ? 'gestor' : 'técnico'} requer validação pela entidade responsável pelo parque.
          </p>
        </div>
      </div>
    );

    // ── Step 3: Pagamento Stripe (condutor) ──────────────────────────────
    if (step === 3 && accountType === 'condutor') return (
      <div className="space-y-4">
        <p className="text-muted-foreground mb-1" style={{ fontSize: '0.82rem' }}>
          O pagamento é processado automaticamente pelo <strong>Stripe</strong> à saída do parque, sem necessidade de interação.
        </p>
        {/* Seleção de método */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'card', icon: 'fa-credit-card', label: 'Cartão' },
            { id: 'mbway', icon: 'fa-mobile-screen', label: 'MB Way' },
            { id: 'mb', icon: 'fa-money-bill', label: 'Multibanco' },
          ] as { id: typeof payMethod; icon: string; label: string }[]).map((m) => (
            <button
              key={m.id}
              onClick={() => setPayMethod(m.id)}
              className={`py-2.5 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                payMethod === m.id ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/40'
              }`}
            >
              <i className={`fas ${m.icon}`} style={{ fontSize: '1rem', color: payMethod === m.id ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }} />
              <span className={`font-semibold ${payMethod === m.id ? 'text-primary' : 'text-muted-foreground'}`} style={{ fontSize: '0.72rem' }}>{m.label}</span>
            </button>
          ))}
        </div>

        {payMethod === 'card' && (
          <div className="space-y-3">
            <div>
              <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Número do cartão</label>
              <input
                type="text" placeholder="1234 5678 9012 3456" value={cardN}
                onChange={(e) => setCardN(e.target.value)} maxLength={19}
                className={`${inputCls} font-mono tracking-wider`} style={{ fontSize: '0.875rem' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Validade</label>
                <input type="text" placeholder="MM/AA" value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)} maxLength={5}
                  className={inputCls} style={{ fontSize: '0.875rem' }} />
              </div>
              <div>
                <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>CVV</label>
                <input type="text" placeholder="123" value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)} maxLength={4}
                  className={inputCls} style={{ fontSize: '0.875rem' }} />
              </div>
            </div>
          </div>
        )}
        {payMethod === 'mbway' && (
          <div>
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Número de telemóvel</label>
            <input type="tel" placeholder="+351 912 345 678" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls} style={{ fontSize: '0.875rem' }} />
          </div>
        )}
        {payMethod === 'mb' && (
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
            <i className="fas fa-info-circle text-muted-foreground mb-2" style={{ fontSize: '1.2rem' }} />
            <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>
              Será enviada uma referência Multibanco por e-mail após cada sessão de estacionamento.
            </p>
          </div>
        )}

      </div>
    );

    // ── Step 4: Tipo de condutor ──────────────────────────────────────────
    if (step === 4 && accountType === 'condutor') return (
      <div className="space-y-3">
        <p className="text-muted-foreground mb-3" style={{ fontSize: '0.82rem' }}>
          Personalize a experiência. O perfil seleccionado activa filtros e recomendações automáticas.
        </p>
        {([
          { id: 'regular', icon: 'fa-car', color: '#7357ec', label: 'Condutor Regular',
            desc: 'Prioridade por preço e distância. Veja a ocupação em tempo real e reserve em até 30 min.' },
          { id: 'ev', icon: 'fa-charging-station', color: '#22c55e', label: 'Condutor EV',
            desc: 'Filtragem por carregadores compatíveis, velocidade de carga e custo por kWh.' },
          { id: 'mobilidade_reduzida', icon: 'fa-wheelchair', color: '#0ea5e9', label: 'Mobilidade Reduzida',
            desc: 'Lugares acessíveis com dimensões, distância à entrada, vigilância e espaço para rampa.' },
        ] as { id: DriverType; icon: string; color: string; label: string; desc: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setDriverTypeLocal(t.id)}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              driverType === t.id ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/40'
            }`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: driverType === t.id ? t.color : undefined }}
              // eslint-disable-next-line react/forbid-dom-props
            >
              {driverType === t.id
                ? <i className={`fas ${t.icon} text-white`} style={{ fontSize: '1rem' }} />
                : <i className={`fas ${t.icon} text-muted-foreground`} style={{ fontSize: '1rem' }} />
              }
            </div>
            <div className="flex-1">
              <p className={`font-bold ${driverType === t.id ? 'text-primary' : 'text-foreground'}`} style={{ fontSize: '0.875rem' }}>{t.label}</p>
              <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>{t.desc}</p>
            </div>
            {driverType === t.id && <i className="fas fa-circle-check text-primary mt-0.5" />}
          </button>
        ))}
      </div>
    );

    // ── Step 5: Preferências (condutor) ──────────────────────────────────
    if (step === 5 && accountType === 'condutor') return (
      <div className="space-y-4">
        <p className="text-muted-foreground mb-2" style={{ fontSize: '0.82rem' }}>
          Configure alertas e preferências de notificação.
        </p>

        {/* Notificações */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-foreground font-bold" style={{ fontSize: '0.85rem' }}>
            <i className="fas fa-bell text-primary mr-2" />Notificações
          </p>
          {[
            { label: 'Alertas de disponibilidade', sub: 'Notificado quando há lugares livres no parque favorito', val: notifPush, set: setNotifPush },
            { label: 'Resumo por e-mail', sub: 'Relatório semanal de custos e deslocações', val: notifEmail, set: setNotifEmail },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>{n.label}</p>
                <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>{n.sub}</p>
              </div>
              <button
                onClick={() => n.set(!n.val)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${n.val ? 'bg-primary' : 'bg-muted'}`}
                role="switch" aria-checked={n.val}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${n.val ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Info RGPD */}

      </div>
    );

    // ── Último step: Concluído ───────────────────────────────────────────
    const isLastConductor = accountType === 'condutor' && step === 6;
    const isLastOther     = accountType !== 'condutor' && step === 3;
    if (isLastConductor || isLastOther) return (
      <div className="text-center py-4">
        <div className="relative inline-block mb-5">
          <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto">
            <i className="fas fa-check text-success" style={{ fontSize: '2rem' }} />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <i className="fas fa-square-parking text-primary-foreground" style={{ fontSize: '0.85rem' }} />
          </div>
        </div>
        <p className="text-foreground mb-1" style={{ fontSize: '1.3rem', fontWeight: 800 }}>Pronto! Bem-vindo ao EasySpot</p>
        <p className="text-muted-foreground mb-6" style={{ fontSize: '0.85rem' }}>
          A sua conta foi configurada com sucesso. Comece a explorar parques em tempo real.
        </p>
        <div className="space-y-2 text-left mb-4">
          {[
            { icon: 'fa-circle-check', color: 'text-success', text: 'Conta criada e verificada' },
            ...(accountType === 'condutor' ? [
              { icon: 'fa-circle-check', color: 'text-success', text: 'Veículo associado' },
              { icon: 'fa-circle-check', color: 'text-success', text: 'Método de pagamento configurado' },
            ] : [
              { icon: 'fa-circle-check', color: 'text-success', text: 'Acesso ao parque configurado' },
            ]),
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <i className={`fas ${item.icon} ${item.color}`} style={{ fontSize: '0.85rem' }} />
              <span className="text-foreground" style={{ fontSize: '0.82rem' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );

    return null;
  };

  // Calcular step actual para a barra de progresso
  const maxStep = accountType === 'condutor' ? 6 : 3;
  const progressPct = Math.round((step / maxStep) * 100);
  const isFinishStep = (accountType === 'condutor' && step === 6) || (accountType !== 'condutor' && step === 3);

  const stepTitles: Record<number, string> = {
    1: 'Tipo de conta',
    2: accountType === 'condutor' ? 'Associar veículo' : 'Configurar acesso',
    3: accountType === 'condutor' ? 'Método de pagamento' : 'Concluído',
    4: 'Tipo de condutor',
    5: 'Preferências',
    6: 'Concluído',
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <i className="fas fa-square-parking text-primary-foreground" style={{ fontSize: '0.75rem' }} />
              </div>
              <span className="text-foreground font-extrabold" style={{ fontSize: '0.95rem' }}>Configuração inicial</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors">
              <i className="fas fa-times text-muted-foreground" style={{ fontSize: '0.8rem' }} />
            </button>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {step}/{maxStep}
            </span>
          </div>
          <p className="text-foreground font-bold mt-2" style={{ fontSize: '0.95rem' }}>{stepTitles[step]}</p>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-border flex gap-3 flex-shrink-0">
          {step > 1 && !isFinishStep && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="fas fa-arrow-left" />
              Anterior
            </button>
          )}
          {!isFinishStep ? (
            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 shadow-md shadow-primary/20 transition-all"
              style={{ fontSize: '0.9rem' }}
            >
              Continuar
              <i className="fas fa-arrow-right" />
            </button>
          ) : (
            <button
              onClick={() => onFinish(driverType, accountType)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 shadow-md shadow-primary/20 transition-all"
              style={{ fontSize: '0.9rem' }}
            >
              <i className="fas fa-rocket" />
              Ir para a aplicação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}