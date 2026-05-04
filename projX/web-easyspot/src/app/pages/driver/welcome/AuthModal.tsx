import { useAuth } from '../../../context/AuthContext';
import logoWhite from '../../../../assets/logo-white.svg';

type ModalMode = 'login' | 'register';

interface Props {
  mode: ModalMode;
  onClose: () => void;
  onSwitchMode: (m: ModalMode) => void;
}

export function AuthModal({ mode, onClose, onSwitchMode }: Props) {
  const { login } = useAuth();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm shadow-2xl overflow-hidden rounded-3xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader mode={mode} onClose={onClose} />
        <ModalBody mode={mode} onLogin={login} onSwitchMode={onSwitchMode} />
      </div>
    </div>
  );
}

function ModalHeader({ mode, onClose }: { mode: ModalMode; onClose: () => void }) {
  return (
    <div
      className="relative px-6 pt-8 pb-6 flex flex-col items-center gap-3"
      style={{ background: 'linear-gradient(135deg, #2e1c7c 0%, #5948a6 50%, #7357ec 100%)' }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
        style={{ background: 'rgba(255,255,255,0.15)' }}
      >
        <i className="fas fa-times text-white" style={{ fontSize: '0.75rem' }} />
      </button>

      <img src={logoWhite} alt="EasySpot" className="h-9 w-auto" />

      <div className="text-center">
        <p className="text-white font-extrabold" style={{ fontSize: '1.05rem' }}>
          {mode === 'login' ? 'Bem-vindo de volta!' : 'Criar conta gratuita'}
        </p>
        <p className="text-white/65 mt-0.5" style={{ fontSize: '0.78rem' }}>
          {mode === 'login' ? 'Aceda à sua conta EasySpot' : 'Registe-se em menos de 1 minuto'}
        </p>
      </div>

      <BackgroundOrbs />
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <>
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(196,186,240,0.1) 0%, transparent 70%)', transform: 'translate(-30%,30%)' }}
      />
    </>
  );
}

function ModalBody({
  mode,
  onLogin,
  onSwitchMode,
}: {
  mode: ModalMode;
  onLogin: () => void;
  onSwitchMode: (m: ModalMode) => void;
}) {
  return (
    <div className="bg-card px-6 py-6 space-y-4">
      <SsoInfoCard />

      <button
        onClick={onLogin}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-extrabold hover:opacity-90 shadow-md transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #5948a6 0%, #7357ec 100%)',
          color: 'white',
          fontSize: '0.9rem',
          boxShadow: '0 4px 14px rgba(115,87,236,0.35)',
        }}
      >
        <i className="fas fa-arrow-right-to-bracket" />
        {mode === 'login' ? 'Entrar' : 'Registar'} com SSO
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
  );
}

function SsoInfoCard() {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 flex gap-3 items-start">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(115,87,236,0.12)' }}>
        <i className="fas fa-shield-halved text-primary" style={{ fontSize: '0.85rem' }} />
      </div>
      <div>
        <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>
          Autenticação segura via SSO
        </p>
        <p className="text-muted-foreground mt-0.5" style={{ fontSize: '0.74rem', lineHeight: 1.5 }}>
          Será redirecionado para o portal de autenticação. A sua sessão é protegida por PKCE.
        </p>
      </div>
    </div>
  );
}
