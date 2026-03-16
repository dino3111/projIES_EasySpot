import { useState } from 'react';
import { Link } from 'react-router';
import { useProfile } from '../context/ProfileContext';
import { mockParkingLots } from '../data/parkingData';

type UserType = 'condutor' | 'ev' | 'acessivel';

const MANAGER_PASSWORD = 'IES123';

export function PerfilPage() {
  const { profile, managerParks, addManagerPark, removeManagerPark } = useProfile();
  const [userType, setUserType] = useState<UserType>('condutor');
  const [notifications, setNotifications] = useState(true);
  const [realtime, setRealtime] = useState(true);
  const isGestor = profile === 'gestor';
  const isTecnico = profile === 'tecnico';
  const isCondutor = profile === 'condutor';
  
  // Manager parks state
  const [searchTerm, setSearchTerm] = useState('');
  const [parkToConfirm, setParkToConfirm] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'add' | 'remove' | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDocumentation, setShowDocumentation] = useState(false);
  
  // Filter parks by search
  const filteredParks = mockParkingLots.filter(park =>
    park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    park.address.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Limit visible parks to 5
  const visibleParks = filteredParks.slice(0, 5);
  
  const handleConfirmAction = () => {
    if (!password) {
      setPasswordError('Palavra-passe é obrigatória');
      return;
    }
    if (password !== MANAGER_PASSWORD) {
      setPasswordError('Palavra-passe incorreta');
      return;
    }
    
    if (parkToConfirm && confirmAction) {
      if (confirmAction === 'add') {
        addManagerPark(parkToConfirm);
      } else {
        removeManagerPark(parkToConfirm);
      }
    }
    
    // Reset
    setParkToConfirm(null);
    setConfirmAction(null);
    setPassword('');
    setPasswordError('');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h1 className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Perfil</h1>
        <p className="text-muted-foreground mt-1" style={{ fontSize: '0.875rem' }}>
          A sua conta EasySpot
        </p>
      </div>

      <UserCard accountType={accountType} />

      {accountType === 'condutor' && <CondutorProfile driverType={driverType} setDriverType={setDriverType} vehicles={vehicles} />}
      {accountType === 'gestor' && <GestorProfile />}
      {accountType === 'tecnico' && <TecnicoProfile />}

      <div className="text-center pb-4 mt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <i className="fas fa-square-parking text-primary text-base" aria-hidden="true" />
          <span className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>EasySpot</span>
        </div>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>Versão 1.0.0 · © 2026 EasySpot</p>
      </div>
    </div>
  );
}

function UserCard({ accountType }: Readonly<{ accountType: string }>) {
  const roleLabel: Record<string, string> = {
    condutor: 'Condutor',
    gestor: 'Gestor de Parques',
    tecnico: 'Técnico de Manutenção',
  };
  const roleIcon: Record<string, string> = {
    condutor: 'fa-car',
    gestor: 'fa-chart-pie',
    tecnico: 'fa-wrench',
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl p-5 mb-5 bg-primary shadow-lg shadow-primary/20">
      <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20">
        <i className="fas fa-user text-white" style={{ fontSize: '1.75rem' }} />
      </div>
      <div>
        <p className="text-white font-bold" style={{ fontSize: '1.1rem' }}>Utilizador EasySpot</p>
        <p className="text-white/80 mt-0.5" style={{ fontSize: '0.8rem' }}>utilizador@easyspot.pt</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <i className={`fas ${roleIcon[accountType]} text-white/70`} style={{ fontSize: '0.7rem' }} />
          <span className="text-white/70 font-medium" style={{ fontSize: '0.72rem' }}>{roleLabel[accountType]}</span>
        </div>
      </div>
    </div>
  );
}

      {/* Informação do técnico */}
      {isTecnico && (
        <>
          <SectionHeader icon="fa-screwdriver-wrench" title="Informação do Técnico" />
          <div className="rounded-2xl p-4 mb-5 bg-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-bold" style={{ fontSize: '0.9rem' }}>
                  Técnico de Manutenção
                </p>
                <p className="text-muted-foreground" style={{ fontSize: '0.75rem' }}>
                  Equipas · Sensorística · Intervenções
                </p>
              </div>
              <span
                className="px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                style={{ fontSize: '0.7rem', fontWeight: 700 }}
              >
                ATIVO
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3 bg-background border border-border">
                <p className="text-muted-foreground" style={{ fontSize: '0.65rem' }}>ID</p>
                <p className="text-foreground font-semibold" style={{ fontSize: '0.85rem' }}>TEC-1042</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Parques Geridos (apenas para gestor) */}
      {isGestor && (
        <>
          <div className="flex items-center gap-2 justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <i className="fas fa-building text-primary" style={{ fontSize: '0.9rem' }} aria-hidden="true"></i>
              <h2 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>Parques Geridos</h2>
            </div>
            <button
              onClick={() => setShowDocumentation(!showDocumentation)}
              className="text-primary hover:text-primary/80 transition-colors"
              style={{ fontSize: '0.8rem' }}
              aria-label="Mostrar documentação"
            >
              <i className="fas fa-circle-question"></i>
            </button>
          </div>
          
          {/* Documentação */}
          {showDocumentation && (
            <div className="rounded-2xl p-4 mb-5 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-900 dark:text-yellow-100 mb-2" style={{ fontSize: '0.78rem' }}>
                <strong>📋 Documentação:</strong>
              </p>
              <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1" style={{ fontSize: '0.72rem' }}>
                <li>• Pesquise parques por nome ou morada</li>
                <li>• Clique em "Adicionar" ou "Remover" para modificar</li>
                <li>• Introduza a palavra-passe <code className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">IES123</code> para confirmar</li>
                <li>• Apenas 5 parques são mostrados de cada vez (use pesquisa para navegar)</li>
              </ul>
            </div>
          )}
          
          <div className="rounded-2xl p-4 mb-5 bg-card border border-border">
            {/* Barra de pesquisa */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-background border border-border">
              <i className="fas fa-search text-muted-foreground" style={{ fontSize: '0.85rem' }}></i>
              <input
                type="text"
                placeholder="Pesquisar parque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-foreground outline-none"
                style={{ fontSize: '0.875rem' }}
              />
            </div>
            
            {/* Lista de parques */}
            <div className="space-y-2.5">
              {visibleParks.length > 0 ? (
                visibleParks.map((park) => {
                  const isSelected = managerParks.includes(park.id);
                  return (
                    <div
                      key={park.id}
                      className="flex items-center gap-3 rounded-xl p-3 bg-background border border-border"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                        aria-hidden="true"
                      >
                        <i className={`fas ${isSelected ? 'fa-check' : 'fa-building'}`} style={{ fontSize: '0.75rem' }}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>{park.name}</p>
                        <p className="text-muted-foreground" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{park.address}</p>
                      </div>
                      <button
                        onClick={() => {
                          setParkToConfirm(park.id);
                          setConfirmAction(isSelected ? 'remove' : 'add');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                          isSelected
                            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        {isSelected ? 'Remover' : 'Adicionar'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>Nenhum parque encontrado</p>
                </div>
              )}
            </div>
            
            {filteredParks.length > 5 && (
              <p className="text-muted-foreground text-center mt-3" style={{ fontSize: '0.72rem' }}>
                Mostrando 5 de {filteredParks.length} parques · Use pesquisa para refinar
              </p>
            )}
          </div>
        </>
      )}

      {/* Modal de confirmação */}
      {parkToConfirm && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-card rounded-t-2xl p-5 border-t border-border">
            <h3 className="text-foreground font-bold mb-2" style={{ fontSize: '1rem' }}>
              {confirmAction === 'add' ? 'Adicionar Parque?' : 'Remover Parque?'}
            </h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: '0.875rem' }}>
              {confirmAction === 'add' 
                ? 'Tem certeza que deseja adicionar este parque à sua lista?'
                : 'Tem certeza que deseja remover este parque da sua lista?'}
            </p>
            
            {/* Password input */}
            <div className="mb-4">
              <label className="text-foreground font-medium mb-1 block" style={{ fontSize: '0.875rem' }}>
                Palavra-passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Introduza a palavra-passe"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary"
                style={{ fontSize: '0.875rem' }}
              />
              {passwordError && (
                <p className="text-red-500 mt-1" style={{ fontSize: '0.72rem' }}>{passwordError}</p>
              )}
            </div>
            
            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setParkToConfirm(null);
                  setConfirmAction(null);
                  setPassword('');
                  setPasswordError('');
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium"
                style={{ fontSize: '0.875rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-all ${
                  confirmAction === 'add' 
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                style={{ fontSize: '0.875rem' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tipo de utilizador (apenas para condutor) */}
      {isCondutor && (
        <>
          <SectionHeader icon="fa-id-card" title="Tipo de Condutor" />
          <div
            className="rounded-2xl p-4 mb-5 bg-card border border-border"
            role="radiogroup"
            aria-label="Selecionar tipo de condutor"
          >
            <p className="text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
              Selecione o seu perfil para personalizar os filtros e recomendações.
            </p>
            <div className="space-y-2.5">
              <UserTypeOption
                id="condutor"
                icon="fa-car"
                label="Condutor Regular"
                desc="Estacionamento convencional, preços e distância"
                selected={userType === 'condutor'}
                onChange={() => setUserType('condutor')}
              />
              <UserTypeOption
                id="ev"
                icon="fa-charging-station"
                label="Condutor Veículo Elétrico"
                desc="Prioridade a lugares com carregadores EV"
                selected={userType === 'ev'}
                onChange={() => setUserType('ev')}
              />
              <UserTypeOption
                id="acessivel"
                icon="fa-wheelchair"
                label="Mobilidade Reduzida"
                desc="Filtros para lugares acessíveis e monitorizados"
                selected={userType === 'acessivel'}
                onChange={() => setUserType('acessivel')}
              />
            </div>
          </div>
        </>
      )}

      {/* Preferências */}
      <SectionHeader icon="fa-sliders" title="Preferências" />
      <div
        className="rounded-2xl overflow-hidden mb-5 bg-card border border-border"
      >
        <ToggleRow
          icon="fa-bell"
          label="Notificações"
          desc="Alertas de disponibilidade e reservas"
          value={notifications}
          onChange={setNotifications}
          id="notif-toggle"
        />
        <div className="h-px bg-border mx-4" />
        <ToggleRow
          icon="fa-rotate"
          label="Actualização Automática"
          desc="Actualizar disponibilidade em tempo real"
          value={realtime}
          onChange={setRealtime}
          id="realtime-toggle"
        />
      </div>

      {/* Estatísticas do utilizador */}
      {isCondutor && (
        <>
          <SectionHeader icon="fa-chart-bar" title="As Minhas Estatísticas" />
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Link to="/gastos" className="contents">
              <StatCard icon="fa-receipt" value="€31.55" label="Gastos" color="var(--color-primary)" />
            </Link>
            <StatCard icon="fa-star" value="0" label="Favoritos" color="#f59e0b" />
            <StatCard icon="fa-route" value="0 km" label="Poupados" color="#22c55e" />
          </div>
        </>
      )}

      <SectionHeader icon="fa-sliders" title="Preferências" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <ToggleRow icon="fa-bell" label="Notificações" desc="Alertas de disponibilidade e reservas"
          value={notifications} onChange={setNotifications} id="notif-toggle" />
        <div className="h-px bg-border mx-4" />
        <ToggleRow icon="fa-rotate" label="Actualização Automática" desc="Actualizar disponibilidade em tempo real"
          value={realtime} onChange={setRealtime} id="realtime-toggle" />
      </div>

      <SectionHeader icon="fa-gear" title="Conta" />
      <div
        className="rounded-2xl overflow-hidden mb-5 bg-card border border-border"
      >
        <AccountRow icon="fa-bell" label="Gerir Notificações" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Segurança" />
        <div className="h-px bg-border mx-4" />
        <Link to="/reportar" className="contents"><AccountRow icon="fa-flag" label="Reportar Problema" accent /></Link>
      </div>
    </>
  );
}

function GestorProfile() {
  return (
    <>
      <SectionHeader icon="fa-chart-pie" title="Resumo Operacional" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-car" value="142" label="Veículos hoje" color="var(--color-primary)" />
        <StatCard icon="fa-euro-sign" value="€984" label="Receita hoje" color="#22c55e" />
        <StatCard icon="fa-circle-exclamation" value="2" label="Alertas" color="#f59e0b" />
      </div>

      <SectionHeader icon="fa-building" title="Parques Geridos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central — Aveiro" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-square-parking" label="Parque Norte — Aveiro" />
      </div>

      <SectionHeader icon="fa-gear" title="Gestão" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <Link to="/gestor/dashboard" className="contents"><AccountRow icon="fa-chart-line" label="Dashboard de Operações" /></Link>
        <div className="h-px bg-border mx-4" />
        <Link to="/gestor/tarifas" className="contents"><AccountRow icon="fa-tags" label="Tarifas e Ocorrências" /></Link>
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-file-export" label="Exportar Relatórios" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Segurança" />
        <div className="h-px bg-border mx-4" />
        <Link to="/reportar" className="contents"><AccountRow icon="fa-flag" label="Reportar Problema" accent /></Link>
      </div>
    </>
  );
}

function TecnicoProfile() {
  return (
    <>
      <SectionHeader icon="fa-wrench" title="Estado dos Sensores" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-circle-check" value="187" label="Operacionais" color="#22c55e" />
        <StatCard icon="fa-triangle-exclamation" value="5" label="Em alerta" color="#f59e0b" />
        <StatCard icon="fa-circle-xmark" value="2" label="Falha" color="#ef4444" />
      </div>

      <SectionHeader icon="fa-building" title="Parque Atribuído" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central — Aveiro" />
      </div>

      <SectionHeader icon="fa-list-check" title="Manutenção" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-screwdriver-wrench" label="Ordens de Manutenção Abertas" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-microchip" label="Diagnóstico de Sensores" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-file-lines" label="Histórico de Intervenções" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Segurança" />
        <div className="h-px bg-border mx-4" />
        <Link to="/reportar" className="contents"><AccountRow icon="fa-flag" label="Reportar Problema" accent /></Link>
      </div>
    </>
  );
}

/* ── Subcomponentes partilhados ── */

function SectionHeader({ icon, title }: Readonly<{ icon: string; title: string }>) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      <h2 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>{title}</h2>
    </div>
  );
}

function UserTypeOption({ id, icon, label, desc, selected, onChange }: Readonly<{
  id: string; icon: string; label: string; desc: string; selected: boolean; onChange: () => void;
}>) {
  return (
    <label htmlFor={id} className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all border ${
      selected ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:bg-black/5 dark:hover:bg-white/5'
    }`}>
      <input type="radio" id={id} name="userType" className="sr-only" checked={selected} onChange={onChange} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
        <i className={`fas ${icon}`} style={{ fontSize: '0.9rem' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-bold" style={{ fontSize: '0.875rem' }}>{label}</p>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </label>
  );
}

function ToggleRow({ icon, label, desc, value, onChange, id }: Readonly<{
  icon: string; label: string; desc: string; value: boolean; onChange: (v: boolean) => void; id: string;
}>) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="text-foreground font-semibold cursor-pointer block" style={{ fontSize: '0.875rem' }}>{label}</label>
        <p className="text-muted-foreground" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <button type="button" id={id} role="switch" aria-checked={value ? 'true' : 'false'} aria-label={label} onClick={() => onChange(!value)}
        className={`flex-shrink-0 rounded-full transition-all duration-200 relative w-11 h-6 cursor-pointer ${value ? 'bg-primary' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 rounded-full bg-white transition-all duration-200 w-5 h-5 shadow-sm ${value ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function StatCard({ icon, value, label, color }: Readonly<{ icon: string; value: string; label: string; color: string }>) {
  return (
    <div className="rounded-xl p-3 text-center bg-card border border-border">
      <i className={`fas ${icon}`} style={{ color, fontSize: '1.1rem' }} />
      <p className="text-foreground font-extrabold mt-1 mb-0.5" style={{ fontSize: '1.25rem' }}>{value}</p>
      <p className="text-muted-foreground font-medium" style={{ fontSize: '0.65rem' }}>{label}</p>
    </div>
  );
}

function AccountRow({ icon, label, accent }: Readonly<{ icon: string; label: string; accent?: boolean }>) {
  return (
    <button type="button" className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left bg-transparent border-none cursor-pointer">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-error/10' : 'bg-primary/10'}`}>
        <i className={`fas ${icon} ${accent ? 'text-error' : 'text-primary'}`} style={{ fontSize: '0.9rem' }} />
      </div>
      <span className={`font-medium flex-1 ${accent ? 'text-error' : 'text-foreground'}`} style={{ fontSize: '0.875rem' }}>{label}</span>
      <i className="fas fa-chevron-right text-muted-foreground/50" style={{ fontSize: '0.75rem' }} />
    </button>
  );
}

function AccountRowWithBadge({ icon, label, badge }: Readonly<{ icon: string; label: string; badge?: string }>) {
  return (
    <button type="button" className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left bg-transparent border-none cursor-pointer">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
        <i className={`fas ${icon} text-primary`} style={{ fontSize: '0.9rem' }} />
      </div>
      <span className="font-medium flex-1 text-foreground" style={{ fontSize: '0.875rem' }}>{label}</span>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-primary text-white font-bold" style={{ fontSize: '0.7rem' }}>
          {badge}
        </span>
      )}
      <i className="fas fa-chevron-right text-muted-foreground/50" style={{ fontSize: '0.75rem' }} />
    </button>
  );
}