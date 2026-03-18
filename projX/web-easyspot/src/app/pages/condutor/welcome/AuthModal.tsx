import { useState } from 'react';

type ModalMode = 'login' | 'register';

const INPUT_CLS = 'w-full rounded-xl px-4 py-3 bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

export function AuthModal({
  mode, onClose, onSwitchMode, onSuccess,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSwitchMode: (m: ModalMode) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [showPw, setShowPw]   = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
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

          {mode === 'register' && (
            <div>
              <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Nome completo</label>
              <input type="text" placeholder="Ex: Filipe Teixeira" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} style={{ fontSize: '0.875rem' }} />
            </div>
          )}
          <div>
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>E-mail</label>
            <input type="email" placeholder="utilizador@exemplo.pt" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLS} style={{ fontSize: '0.875rem' }} />
          </div>
          <div>
            <label className="block text-foreground font-semibold mb-1.5" style={{ fontSize: '0.8rem' }}>Palavra-passe</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLS} pr-10`} style={{ fontSize: '0.875rem' }}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
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
            <button onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')} className="text-primary font-semibold hover:underline">
              {mode === 'login' ? 'Registe-se' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
