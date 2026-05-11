import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useProfile } from '../../../context/ProfileContext';
import { paymentApi, profileApi, type DriverProfileResponse, type ManagerProfileResponse, type PaymentMethodSummaryResponse, type ProfileResponse, type TechnicianProfileResponse } from '../../../../services/apiService';
import { SectionHeader, UserTypeOption, ToggleRow, StatCard, AccountRow, AccountRowWithBadge } from './ProfilePrimitives';
import { StepPaymentStripe } from '../welcome/StepPaymentStripe';
import { LocationPreviewMap } from '../../../components/parking/LocationPreviewMap';

const DRIVER_LOCATION_ENABLED_KEY = 'easyspot_driver_location_enabled';

export function DriverProfile({ profileData, onProfileUpdate }: Readonly<{ profileData: DriverProfileResponse | null; onProfileUpdate: (profile: ProfileResponse) => void }>) {
  const { driverType, setDriverType, vehicles } = useProfile();
  const [activeTab, setActiveTab] = useState<'profile' | 'payments'>('profile');
  const [notifications, setNotifications] = useState(profileData?.notificationsEnabled ?? true);
  const [pushNotifications, setPushNotifications] = useState(profileData?.pushNotificationsEnabled ?? profileData?.notificationsEnabled ?? true);
  const [emailNotifications, setEmailNotifications] = useState(profileData?.emailNotificationsEnabled ?? false);
  const [realtime, setRealtime] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(() => {
    if (typeof globalThis.localStorage === 'undefined') return false;
    return globalThis.localStorage.getItem(DRIVER_LOCATION_ENABLED_KEY) === '1';
  });
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; capturedAt: Date } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSummaryResponse[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const persistProfile = async (payload: { notificationsEnabled?: boolean; pushNotificationsEnabled?: boolean; emailNotificationsEnabled?: boolean; driverType?: 'regular' | 'ev' | 'reduced_mobility' | null }) => {
    const updated = await profileApi.update(payload);
    onProfileUpdate(updated);
  };

  useEffect(() => {
    if (!profileData) return;
    setNotifications(profileData.notificationsEnabled);
    setPushNotifications(profileData.pushNotificationsEnabled);
    setEmailNotifications(profileData.emailNotificationsEnabled);
    setDriverType(profileData.driverType);
  }, [profileData, setDriverType]);

  const loadPaymentMethods = async () => {
    setLoadingPayments(true);
    setPaymentsError(null);
    try {
      const methods = await paymentApi.listMethods();
      setPaymentMethods(methods);
    } catch (error) {
      setPaymentsError(error instanceof Error ? error.message : 'Não foi possível carregar métodos de pagamento.');
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPaymentMethods();
    }
  }, [activeTab]);

  const handleRemoveMethod = async (id: string) => {
    setRemovingId(id);
    try {
      await paymentApi.removeMethod(id);
      await loadPaymentMethods();
    } catch (error) {
      setPaymentsError(error instanceof Error ? error.message : 'Não foi possível remover o método.');
    } finally {
      setRemovingId(null);
    }
  };

  const saveNotificationPreferences = async () => {
    setSavingNotifications(true);
    setNotificationsError(null);
    try {
      const enabled = pushNotifications || emailNotifications;
      const updated = await profileApi.update({
        notificationsEnabled: enabled,
        pushNotificationsEnabled: pushNotifications,
        emailNotificationsEnabled: emailNotifications,
      });
      onProfileUpdate(updated);
      setNotifications(enabled);
      setShowNotificationsModal(false);
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : 'Não foi possível guardar as preferências.');
    } finally {
      setSavingNotifications(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const url = await paymentApi.createCustomerPortalSession();
      globalThis.location.href = url;
    } catch (error) {
      setPaymentsError(error instanceof Error ? error.message : 'Não foi possível abrir o portal Stripe.');
    }
  };

  useEffect(() => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(DRIVER_LOCATION_ENABLED_KEY, locationEnabled ? '1' : '0');
    }

    if (!locationEnabled) {
      setLocationError(null);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocalização indisponível neste dispositivo.');
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          capturedAt: new Date(),
        });
      },
      () => {
        setLocationError('Não foi possível obter a sua localização. Verifique as permissões do browser.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [locationEnabled]);

  return (
    <>
      <div className="rounded-2xl p-1 mb-5 bg-card border border-border flex">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${activeTab === 'profile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
          style={{ fontSize: '0.82rem' }}
        >
          Perfil
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2.5 rounded-xl font-semibold transition-all ${activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
          style={{ fontSize: '0.82rem' }}
        >
          Pagamentos
        </button>
      </div>

      {activeTab === 'profile' ? (
        <>
      <SectionHeader icon="fa-car" title="Os Meus Veículos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRowWithBadge to="/vehicles" icon="fa-car-side" label="Gerir Veículos" badge={vehicles.length > 0 ? String(vehicles.length) : undefined} />
      </div>

      <SectionHeader icon="fa-id-card" title="Tipo de Condutor" />
      <div className="rounded-2xl p-4 mb-5 bg-card border border-border" role="radiogroup" aria-label="Selecionar tipo de condutor">
        <p className="text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
          Selecione o seu perfil para personalizar os filtros e recomendações.
        </p>
        <div className="space-y-2.5">
          <UserTypeOption id="condutor"  icon="fa-car"              label="Condutor Regular"          desc="Estacionamento convencional, precos e distancia"      selected={driverType === 'regular' || driverType === null} onChange={() => { setDriverType('regular'); void persistProfile({ driverType: 'regular' }); }} />
          <UserTypeOption id="ev"        icon="fa-charging-station" label="Condutor Veiculo Eletrico"  desc="Prioridade a lugares com carregadores EV"             selected={driverType === 'ev'}                             onChange={() => { setDriverType('ev'); void persistProfile({ driverType: 'ev' }); }} />
          <UserTypeOption id="acessivel" icon="fa-wheelchair"       label="Mobilidade Reduzida"        desc="Filtros para lugares acessiveis e monitorizados"      selected={driverType === 'reduced_mobility'}               onChange={() => { setDriverType('reduced_mobility'); void persistProfile({ driverType: 'reduced_mobility' }); }} />
        </div>
      </div>

      <SectionHeader icon="fa-sliders" title="Preferencias" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <ToggleRow icon="fa-bell"   label="Notificacoes"          desc="Alertas de disponibilidade e reservas"        value={notifications} onChange={(value) => { setNotifications(value); void persistProfile({ notificationsEnabled: value }); }} id="notif-toggle" />
        <div className="h-px bg-border mx-4" />
        <ToggleRow icon="fa-rotate" label="Atualizacao Automatica" desc="Atualizar disponibilidade em tempo real"       value={realtime}      onChange={setRealtime}      id="realtime-toggle" />
        <div className="h-px bg-border mx-4" />
        <ToggleRow
          icon="fa-location-dot"
          label="Partilha de Localizacao"
          desc="Ativa/desativa a captura da sua localizacao"
          value={locationEnabled}
          onChange={setLocationEnabled}
          id="location-toggle"
        />
        <div className="px-4 pb-3">
          {locationEnabled ? (
            currentLocation ? (
              <div className="space-y-2">
                <p className="text-muted-foreground" style={{ fontSize: '0.74rem' }}>
                  Local atual: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)} · {currentLocation.capturedAt.toLocaleTimeString('pt-PT')}
                </p>
                <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                  <LocationPreviewMap lat={currentLocation.lat} lng={currentLocation.lng} />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground" style={{ fontSize: '0.74rem' }}>
                A obter localização...
              </p>
            )
          ) : (
            <p className="text-muted-foreground" style={{ fontSize: '0.74rem' }}>
              Localização desativada.
            </p>
          )}
          {locationError && (
            <p className="text-error mt-1" style={{ fontSize: '0.72rem' }}>
              {locationError}
            </p>
          )}
        </div>
      </div>

      <SectionHeader icon="fa-chart-bar" title="As Minhas Estatisticas" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Link to="/costs" className="contents">
          <StatCard icon="fa-receipt" value={`€${Number(profileData?.spending?.totalEuros ?? 0).toFixed(2)}`} label="Gastos"    color="var(--color-primary)" />
        </Link>
        <StatCard icon="fa-star"  value={String(profileData?.favoritesCount ?? 0)}    label="Favoritos" color="#f59e0b" />
        <StatCard icon="fa-route" value="0 km" label="Poupados"  color="#22c55e" />
      </div>

      <SectionHeader icon="fa-gear" title="Conta" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-bell"          label="Gerir Notificacoes" onClick={() => setShowNotificationsModal(true)} />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Seguranca" onClick={() => setShowPrivacyModal(true)} />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/report" icon="fa-flag" label="Reportar Problema" accent />
      </div>
        </>
      ) : (
        <>
      <SectionHeader icon="fa-credit-card" title="Métodos de Pagamento Stripe" />
      <div className="rounded-2xl p-4 mb-5 bg-card border border-border space-y-3">
        <p className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>
          Consulte, adicione e remova métodos de pagamento associados à sua conta Stripe.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddPaymentModal(true)}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all"
            style={{ fontSize: '0.78rem' }}
          >
            <i className="fas fa-plus mr-1.5" aria-hidden="true" />
            {' '}Adicionar método
          </button>
          <button
            type="button"
            onClick={openCustomerPortal}
            className="px-3.5 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted/40 transition-all"
            style={{ fontSize: '0.78rem' }}
          >
            <i className="fas fa-up-right-from-square mr-1.5" aria-hidden="true" />
            {' '}Abrir portal Stripe
          </button>
          <button
            type="button"
            onClick={loadPaymentMethods}
            className="px-3.5 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted/40 transition-all"
            style={{ fontSize: '0.78rem' }}
          >
            <i className={`fas ${loadingPayments ? 'fa-spinner fa-spin' : 'fa-rotate-right'} mr-1.5`} aria-hidden="true" />
            {' '}Atualizar
          </button>
        </div>
        {paymentsError && (
          <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-error" style={{ fontSize: '0.75rem' }}>
            {paymentsError}
          </div>
        )}
        <div className="space-y-2">
          {loadingPayments && (
            <div className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>A carregar métodos...</div>
          )}
          {!loadingPayments && paymentMethods.length === 0 && !paymentsError && (
            <div className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>Sem métodos guardados.</div>
          )}
          {!loadingPayments && paymentMethods.map((method) => (
            <div key={method.id} className="rounded-xl border border-border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-foreground font-semibold" style={{ fontSize: '0.82rem' }}>
                  {method.brand ? `${method.brand.toUpperCase()} •••• ${method.last4 ?? '----'}` : `${method.type} (${method.id})`}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: '0.72rem' }}>
                  {method.expMonth && method.expYear ? `Validade ${String(method.expMonth).padStart(2, '0')}/${method.expYear}` : 'Sem validade disponível'}
                  {method.isDefault ? ' · Predefinido' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveMethod(method.id)}
                disabled={removingId === method.id}
                className="px-2.5 py-1.5 rounded-lg border border-error/30 text-error hover:bg-error/10 disabled:opacity-50"
                style={{ fontSize: '0.72rem' }}
              >
                {removingId === method.id ? 'A remover...' : 'Remover'}
              </button>
            </div>
          ))}
        </div>
      </div>
        </>
      )}

      {showAddPaymentModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>Adicionar método de pagamento</h3>
              <button type="button" onClick={() => setShowAddPaymentModal(false)} className="text-muted-foreground hover:text-foreground">
                <i className="fas fa-times" />
              </button>
            </div>
            <StepPaymentStripe
              onReady={(confirmed) => {
                if (confirmed) {
                  setShowAddPaymentModal(false);
                  loadPaymentMethods();
                }
              }}
            />
          </div>
        </div>
      )}

      {showNotificationsModal && (
        <SimpleModal title="Gerir Notificações" onClose={() => setShowNotificationsModal(false)}>
          <div className="space-y-3">
            <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
              Escolha como quer receber alertas e avisos do EasySpot.
            </p>

            {notificationsError && (
              <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-error" style={{ fontSize: '0.75rem' }}>
                {notificationsError}
              </div>
            )}

            <ToggleRow
              icon="fa-bell"
              label="Notificações gerais"
              desc="Ativa ou desativa alertas desta conta"
              value={notifications}
              onChange={(value) => {
                setNotifications(value);
                setPushNotifications(value);
                setEmailNotifications(value ? emailNotifications : false);
              }}
              id="modal-notif-toggle"
            />
            <div className="h-px bg-border" />
            <ToggleRow
              icon="fa-mobile-screen-button"
              label="Push no browser"
              desc="Alertas em tempo real no navegador"
              value={pushNotifications}
              onChange={(value) => {
                setPushNotifications(value);
                setNotifications(value || emailNotifications);
              }}
              id="modal-push-toggle"
            />
            <div className="h-px bg-border" />
            <ToggleRow
              icon="fa-envelope"
              label="Email"
              desc="Recebe resumos e alertas por correio eletrónico"
              value={emailNotifications}
              onChange={(value) => {
                setEmailNotifications(value);
                setNotifications(pushNotifications || value);
              }}
              id="modal-email-toggle"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="px-3.5 py-2 rounded-xl border border-border text-foreground font-semibold hover:bg-muted/40 transition-all"
                style={{ fontSize: '0.78rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { void saveNotificationPreferences(); }}
                disabled={savingNotifications}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-60"
                style={{ fontSize: '0.78rem' }}
              >
                {savingNotifications ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </SimpleModal>
      )}

      {showPrivacyModal && (
        <SimpleModal title="Privacidade e Segurança" onClose={() => setShowPrivacyModal(false)}>
          <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>Esta secção será expandida com opções de privacidade. Para já, os dados sensíveis são geridos no backend autenticado.</p>
        </SimpleModal>
      )}
    </>
  );
}

export function ManagerProfile({ profileData }: Readonly<{ profileData: ManagerProfileResponse | null }>) {
  return (
    <>
      <SectionHeader icon="fa-chart-pie" title="Resumo Operacional" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-car"                value={String(profileData?.todayVehicles ?? 0)}  label="Veiculos hoje" color="var(--color-primary)" />
        <StatCard icon="fa-euro-sign"          value={`€${Number(profileData?.todayRevenue ?? 0).toFixed(2)}`} label="Receita hoje"  color="#22c55e" />
        <StatCard icon="fa-circle-exclamation" value={String(profileData?.openAlerts ?? 0)}    label="Alertas"       color="#f59e0b" />
      </div>

      <SectionHeader icon="fa-building" title="Parques Geridos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central - Aveiro" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-square-parking" label="Parque Norte - Aveiro" />
      </div>

      <SectionHeader icon="fa-gear" title="Gestao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow to="/manager/dashboard"         icon="fa-chart-line"    label="Dashboard de Operacoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/manager/tariffs-incidents" icon="fa-tags"          label="Tarifas e Ocorrencias" />
        <div className="h-px bg-border mx-4" />
        <AccountRow                                 icon="fa-file-export"   label="Exportar Relatorios" />
        <div className="h-px bg-border mx-4" />
        <AccountRow                                 icon="fa-shield-halved" label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/report" icon="fa-flag" label="Reportar Problema" accent />
      </div>
    </>
  );
}

export function TechnicianProfile({ profileData }: Readonly<{ profileData: TechnicianProfileResponse | null }>) {
  return (
    <>
      <SectionHeader icon="fa-wrench" title="Estado dos Sensores" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-circle-check"         value={String(profileData?.sensorSummary?.operational ?? 0)} label="Operacionais" color="#22c55e" />
        <StatCard icon="fa-triangle-exclamation" value={String((profileData?.sensorSummary?.total ?? 0) - (profileData?.sensorSummary?.operational ?? 0))}   label="Em alerta"    color="#f59e0b" />
        <StatCard icon="fa-circle-xmark"         value={String(profileData?.openFaults ?? 0)}   label="Falha"        color="#ef4444" />
      </div>

      <SectionHeader icon="fa-building" title="Parque Atribuido" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-square-parking" label="Parque Central - Aveiro" />
      </div>

      <SectionHeader icon="fa-list-check" title="Manutencao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow icon="fa-screwdriver-wrench" label="Ordens de Manutencao Abertas" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-microchip"          label="Diagnostico de Sensores" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-file-lines"         label="Historico de Intervencoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved"      label="Privacidade e Seguranca" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/report" icon="fa-flag" label="Reportar Problema" accent />
      </div>
    </>
  );
}

function SimpleModal({ title, onClose, children }: Readonly<{ title: string; onClose: () => void; children: React.ReactNode }>) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>{title}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fas fa-times" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
