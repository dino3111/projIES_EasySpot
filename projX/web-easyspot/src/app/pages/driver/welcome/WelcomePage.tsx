import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../../assets/logo.svg';
import logoWhite from '../../../../assets/logo-white.svg';

const features = [
  { icon: 'fa-satellite-dish',   title: 'Sensores em Tempo Real',     desc: 'Infravermelhos e LEDs em cada lugar. Disponibilidade atualizada ao segundo.' },
  { icon: 'fa-id-card',          title: 'Identificação Automática',    desc: 'Leitura de matrícula por OCR na entrada.' },
  { icon: 'fa-charging-station', title: 'Carregamento EV',             desc: 'Localize carregadores compatíveis, veja velocidade e preço por kWh em tempo real.' },
  { icon: 'fa-wheelchair',       title: 'Acessibilidade Total',        desc: 'Dimensões dos lugares, distância à entrada e vigilância para mobilidade reduzida.' },
  { icon: 'fa-euro-sign',        title: 'Cobrança Inteligente',        desc: 'Faturação automática via Stripe com histórico, comparação de custos e alertas.' },
  { icon: 'fa-chart-line',       title: 'Dashboard de Gestão',         desc: 'Ocupação, receita, saúde dos sensores e relatórios exportáveis para operadores.' },
];

const personas = [
  { icon: 'fa-car',       color: '#7357ec', bg: 'rgba(115,87,236,0.1)', title: 'Condutor Regular',   desc: 'Encontre o parque ideal em segundos. Veja lugares livres, preços e reserve com antecedência.' },
  { icon: 'fa-bolt',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  title: 'Condutor EV',         desc: 'Garanta um carregador compatível antes de sair. Acompanhe a carga em tempo real.' },
  { icon: 'fa-wheelchair',color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', title: 'Mobilidade Reduzida', desc: 'Filtre lugares acessíveis, veja dimensões exatas e distâncias à entrada. Vigiado e monitorizado.' },
  { icon: 'fa-chart-bar', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', title: 'Gestor / Técnico',    desc: 'Dashboard de operações, relatórios de receita, saúde dos sensores e ordens de manutenção.' },
];

const steps = [
  { n: '1', icon: 'fa-user-plus',   title: 'Crie a sua conta',       desc: 'Registe-se com e-mail ou SSO (Google, Microsoft). Secure via Authentik.' },
  { n: '2', icon: 'fa-car-side',    title: 'Associe o seu veículo',  desc: 'Adicione a matrícula para identificação automática.' },
  { n: '3', icon: 'fa-credit-card', title: 'Configure o pagamento',  desc: 'Ligue o seu Stripe, cartão ou MB Way. Cobrança automática à saída.' },
];

function SessionExpiredModal({ onLogin, onClose }: Readonly<{ onLogin: () => void; onClose: () => void }>) {
  const handleBackdropKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleBackdropKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Fechar aviso de sessão expirada"
    >
      <div
        className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
            <i className="fas fa-clock text-amber-500" style={{ fontSize: '1.5rem' }} />
          </div>
          <div>
            <h2 className="text-foreground font-bold text-lg mb-1">Sessão expirada</h2>
            <p className="text-muted-foreground text-sm">A sua sessão terminou. Inicie sessão novamente para continuar.</p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors text-sm">
              Fechar
            </button>
            <button onClick={onLogin} className="flex-1 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/25 text-sm">
              <i className="fas fa-sign-in-alt mr-2" />Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WelcomePage() {
  const { login, register } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showExpiredModal, setShowExpiredModal] = useState(searchParams.get('session') === 'expired');

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      setShowExpiredModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleLogin = () => {
    setShowExpiredModal(false);
    login();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showExpiredModal && <SessionExpiredModal onLogin={handleLogin} onClose={() => setShowExpiredModal(false)} />}

      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <img src={logo} alt="EasySpot" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <button onClick={login} className="px-4 py-2 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors" style={{ fontSize: '0.85rem' }}>Entrar</button>
            <button onClick={register} className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/25" style={{ fontSize: '0.85rem' }}>Criar conta</button>
          </div>
        </div>
      </nav>

      <section className="relative pt-14 min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #2e1c7c 0%, #5948a6 40%, #7357ec 100%)' }}>
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a99be8 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center py-20">
          <img src={logoWhite} alt="EasySpot" className="h-12 w-auto mx-auto mb-6" />
          <h1 className="text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1 }}>
            Estacione sem stress,<br /><span style={{ color: '#c4baf0' }}>pague só o que usa.</span>
          </h1>
          <p className="text-white/75 mb-8 max-w-xl mx-auto" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)' }}>
            Disponibilidade em tempo real, carregadores EV, lugares acessíveis e cobrança automática. Tudo numa só app.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <button onClick={register} className="px-7 py-3.5 rounded-full bg-white text-primary font-extrabold hover:bg-white/90 shadow-xl transition-all active:scale-[0.98]" style={{ fontSize: '0.95rem' }}>
              <i className="fas fa-rocket mr-2" />Começar gratuitamente
            </button>
            <button onClick={login} className="px-7 py-3.5 rounded-full border-2 border-white/40 text-white font-semibold hover:bg-white/10 transition-all" style={{ fontSize: '0.95rem' }}>
              <i className="fas fa-sign-in-alt mr-2" />Já tenho conta
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ height: 60 }}>
            <path d="M0 60L1440 60L1440 20C1200 60 240 0 0 40L0 60Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-primary font-bold uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}><i className="fas fa-users mr-2" />Personas</p>
          <h2 className="text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>Feito para todos</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto" style={{ fontSize: '0.9rem' }}>Seja condutor, motorista EV, utilizador com mobilidade reduzida ou gestor de parques — o EasySpot adapta-se às suas necessidades.</p>
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

      <section className="py-16 px-4 sm:px-6 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-primary font-bold uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}><i className="fas fa-microchip mr-2" />Tecnologia</p>
            <h2 className="text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>Infraestrutura inteligente</h2>
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

      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-primary font-bold uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}><i className="fas fa-list-ol mr-2" />Primeiros passos</p>
          <h2 className="text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>Pronto em 3 minutos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-col items-center text-center relative">
              {i < steps.length - 1 && <div className="hidden sm:block absolute top-6 left-1/2 w-full border-t-2 border-dashed border-primary/20 translate-x-1/4" />}
              <div className="relative w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/25 z-10">
                <i className={`fas ${s.icon} text-primary-foreground`} style={{ fontSize: '1.2rem' }} />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-extrabold" style={{ fontSize: '0.65rem' }}>{s.n}</span>
              </div>
              <h3 className="text-foreground font-bold mb-1.5" style={{ fontSize: '0.9rem' }}>{s.title}</h3>
              <p className="text-muted-foreground" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto rounded-3xl p-10 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2e1c7c 0%, #7357ec 100%)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <i className="fas fa-square-parking text-white/20 absolute bottom-4 left-6" style={{ fontSize: '5rem' }} />
          <div className="relative z-10">
            <h2 className="text-white mb-3" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800 }}>Comece agora. É gratuito.</h2>
            <p className="text-white/75 mb-7" style={{ fontSize: '0.9rem' }}>Sem compromisso. Configure a sua conta em menos de 3 minutos e estacione de forma mais inteligente.</p>
            <button onClick={register} className="px-8 py-3.5 rounded-full bg-white font-extrabold hover:bg-white/90 transition-all shadow-xl active:scale-[0.98]" style={{ fontSize: '0.95rem', color: '#7357ec' }}>
              <i className="fas fa-arrow-right mr-2" />Criar conta gratuita
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logo} alt="EasySpot" className="h-6 w-auto" />
          <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>© 2026 EasySpot · <a href="mailto:suporte@easyspot.pt" className="text-primary hover:underline">suporte@easyspot.pt</a> · Conformidade RGPD</p>
          <div className="flex gap-3">
            {['fa-shield-halved', 'fa-file-contract', 'fa-envelope'].map((ic) => (
              <button key={ic} className="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 transition-colors flex items-center justify-center">
                <i className={`fas ${ic} text-muted-foreground`} style={{ fontSize: '0.75rem' }} />
              </button>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
