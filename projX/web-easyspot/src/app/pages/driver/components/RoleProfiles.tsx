import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useProfile } from '../../../context/ProfileContext';
import { paymentApi, profileApi, type DriverProfileResponse, type ManagerProfileResponse, type PaymentMethodSummaryResponse, type ProfileResponse, type TechnicianProfileResponse } from '../../../../services/apiService';
import { fetchMyAssignedParks } from '../../../services/technicianApi';
import { SectionHeader, UserTypeOption, ToggleRow, StatCard, AccountRow, AccountRowWithBadge } from './ProfilePrimitives';
import { StepPaymentStripe } from '../welcome/StepPaymentStripe';
import { fetchManagerTariffs, fetchManagerDashboard, fetchTechnicians, type TechnicianSummary } from '../../../services/managerApi';
import { fetchParksList } from '../../../services/parksApi';
import { CreateTechnicianModal } from '../../manager/components/CreateTechnicianModal';
import { LocationPreviewMap } from '../../../components/parking/LocationPreviewMap';

const DRIVER_LOCATION_ENABLED_KEY = 'easyspot_driver_location_enabled';

export function DriverProfile({ profileData, onProfileUpdate }: Readonly<{ profileData: DriverProfileResponse | null; onProfileUpdate: (profile: ProfileResponse) => void }>) {
  const { driverTypes, setDriverTypes, vehicles } = useProfile();
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

  const persistProfile = async (payload: { notificationsEnabled?: boolean; pushNotificationsEnabled?: boolean; emailNotificationsEnabled?: boolean; driverType?: 'regular' | 'ev' | 'reduced_mobility' | null; driverTypes?: Array<'regular' | 'ev' | 'reduced_mobility'> }) => {
    const updated = await profileApi.update(payload);
    onProfileUpdate(updated);
  };

  useEffect(() => {
    if (!profileData) return;
    setNotifications(profileData.notificationsEnabled);
    setPushNotifications(profileData.pushNotificationsEnabled);
    setEmailNotifications(profileData.emailNotificationsEnabled);
    setDriverTypes(profileData.driverTypes && profileData.driverTypes.length > 0 ? profileData.driverTypes : [profileData.driverType ?? 'regular']);
  }, [profileData, setDriverTypes]);

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
      <div className="rounded-2xl p-4 mb-5 bg-card border border-border" role="group" aria-label="Selecionar perfis de condutor">
        <p className="text-muted-foreground mb-3" style={{ fontSize: '0.78rem' }}>
          Selecione um ou mais perfis para personalizar filtros e recomendações.
        </p>
        <div className="space-y-2.5">
          <UserTypeOption id="condutor"  icon="fa-car"              label="Condutor Regular"          desc="Estacionamento convencional, precos e distancia"      selected={driverTypes.includes('regular')} onChange={() => { const next: Array<'regular' | 'ev' | 'reduced_mobility'> = ['regular']; setDriverTypes(next); void persistProfile({ driverTypes: next }); }} />
          <UserTypeOption id="ev"        icon="fa-charging-station" label="Condutor Veiculo Eletrico"  desc="Prioridade a lugares com carregadores EV"             selected={driverTypes.includes('ev')} onChange={() => { const base = driverTypes.filter((d) => d !== 'regular'); const next: Array<'regular' | 'ev' | 'reduced_mobility'> = base.includes('ev') ? (base.filter((d) => d !== 'ev') as Array<'regular' | 'ev' | 'reduced_mobility'>) : ([...base, 'ev'] as Array<'regular' | 'ev' | 'reduced_mobility'>); const normalized = next.length > 0 ? next : ['regular']; setDriverTypes(normalized); void persistProfile({ driverTypes: normalized }); }} />
          <UserTypeOption id="acessivel" icon="fa-wheelchair"       label="Mobilidade Reduzida"        desc="Filtros para lugares acessiveis e monitorizados"      selected={driverTypes.includes('reduced_mobility')} onChange={() => { const base = driverTypes.filter((d) => d !== 'regular'); const next: Array<'regular' | 'ev' | 'reduced_mobility'> = base.includes('reduced_mobility') ? (base.filter((d) => d !== 'reduced_mobility') as Array<'regular' | 'ev' | 'reduced_mobility'>) : ([...base, 'reduced_mobility'] as Array<'regular' | 'ev' | 'reduced_mobility'>); const normalized = next.length > 0 ? next : ['regular']; setDriverTypes(normalized); void persistProfile({ driverTypes: normalized }); }} />
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
        <AccountRow icon="fa-flag" label="Reportar Problema" to="/report" />
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

      {showPrivacyModal && <PrivacySecurityModal onClose={() => setShowPrivacyModal(false)} />}
    </>
  );
}

type ManagedPark = { id: string; name: string; city: string; address: string; totalSpaces: number; freeSpaces: number };

function CreateParkModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [totalSpaces, setTotalSpaces] = useState('');
  const [techInput, setTechInput] = useState('');
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTech = () => {
    const t = techInput.trim();
    if (t && !technicians.includes(t)) setTechnicians(prev => [...prev, t]);
    setTechInput('');
  };

  const removeTech = (t: string) => setTechnicians(prev => prev.filter(x => x !== t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !city.trim() || !totalSpaces.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Park creation endpoint — wire up when backend ready
      await Promise.resolve();
      onClose();
    } catch {
      setError('Não foi possível criar o parque.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-border bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>Criar Parque</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-muted-foreground block mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nome *</label>
            <input className={inputCls} style={{ fontSize: '0.875rem' }} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Parque Central" />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Morada *</label>
            <input className={inputCls} style={{ fontSize: '0.875rem' }} value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, Nº" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-muted-foreground block mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Cidade *</label>
              <input className={inputCls} style={{ fontSize: '0.875rem' }} value={city} onChange={e => setCity(e.target.value)} placeholder="Aveiro" />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Lugares *</label>
              <input className={inputCls} style={{ fontSize: '0.875rem' }} type="number" min="1" value={totalSpaces} onChange={e => setTotalSpaces(e.target.value)} placeholder="200" />
            </div>
          </div>

          <div>
            <label className="text-muted-foreground block mb-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Técnicos Atribuídos</label>
            <div className="flex gap-2 mb-2">
              <input
                className={inputCls}
                style={{ fontSize: '0.875rem' }}
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                placeholder="Nome do técnico"
              />
              <button type="button" onClick={addTech} className="px-3 py-2 rounded-xl bg-primary text-white font-semibold flex-shrink-0" style={{ fontSize: '0.8rem' }}>
                Adicionar
              </button>
            </div>
            {technicians.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {technicians.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium" style={{ fontSize: '0.75rem' }}>
                    <i className="fas fa-user-gear" style={{ fontSize: '0.7rem' }} />
                    {t}
                    <button type="button" onClick={() => removeTech(t)} className="hover:text-error ml-0.5">
                      <i className="fas fa-times" style={{ fontSize: '0.65rem' }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-error" style={{ fontSize: '0.78rem' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-foreground font-semibold" style={{ fontSize: '0.875rem' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold" style={{ fontSize: '0.875rem' }}>
              {saving ? <i className="fas fa-circle-notch fa-spin" /> : 'Criar Parque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ManagedParksSection() {
  const [parks, setParks] = useState<ManagedPark[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const PAGE_SIZE = 5;

  const load = async (p: number, q: string) => {
    setLoading(true);
    try {
      const result = await fetchParksList({ page: p, pageSize: PAGE_SIZE, textQuery: q || undefined });
      setParks(result.items.map(l => ({
        id: l.id,
        name: l.name,
        city: l.localidade,
        address: l.address,
        totalSpaces: l.totalSpots,
        freeSpaces: l.availableSpots,
      })));
      setTotalPages(result.pagination.totalPages ?? 1);
    } catch {
      setParks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, search); }, [page, search]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <>
      <SectionHeader icon="fa-building" title="Parques Geridos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-2 flex-1 bg-muted rounded-xl px-3 py-1.5">
            <i className="fas fa-magnifying-glass text-muted-foreground" style={{ fontSize: '0.8rem' }} />
            <input
              type="search"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Pesquisar parque..."
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-semibold flex-shrink-0"
            style={{ fontSize: '0.78rem' }}
          >
            <i className="fas fa-plus" style={{ fontSize: '0.75rem' }} />
            Criar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <i className="fas fa-circle-notch fa-spin text-primary" />
          </div>
        ) : parks.length === 0 ? (
          <p className="text-center text-muted-foreground py-6" style={{ fontSize: '0.82rem' }}>Nenhum parque encontrado.</p>
        ) : (
          parks.map((p, i) => (
            <div key={p.id}>
              {i > 0 && <div className="h-px bg-border mx-4" />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10">
                  <i className="fas fa-square-parking text-primary" style={{ fontSize: '0.9rem' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold truncate" style={{ fontSize: '0.875rem' }}>{p.name}</p>
                  <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>{p.city} · {p.freeSpaces}/{p.totalSpaces} livres</p>
                </div>
              </div>
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="text-primary disabled:opacity-30 font-semibold"
              style={{ fontSize: '0.8rem' }}
            >
              <i className="fas fa-chevron-left mr-1" />Anterior
            </button>
            <span className="text-muted-foreground" style={{ fontSize: '0.78rem' }}>{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-primary disabled:opacity-30 font-semibold"
              style={{ fontSize: '0.8rem' }}
            >
              Próximo<i className="fas fa-chevron-right ml-1" />
            </button>
          </div>
        )}
      </div>

      {showCreate && <CreateParkModal onClose={() => { setShowCreate(false); load(page, search); }} />}
    </>
  );
}

function ExportReportsModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const [tariffs, dashboard] = await Promise.all([
        fetchManagerTariffs(),
        fetchManagerDashboard(),
      ]);
      const report = {
        exportedAt: new Date().toISOString(),
        tarifas: tariffs,
        painelDesempenho: dashboard,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-gestor-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setError('Não foi possível exportar os relatórios.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-bold" style={{ fontSize: '0.95rem' }}>Exportar Relatórios</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-foreground" style={{ fontSize: '0.82rem' }}>
            <i className="fas fa-file-invoice-dollar text-primary" />
            <span>Tarifários de todos os parques</span>
          </div>
          <div className="flex items-center gap-2 text-foreground" style={{ fontSize: '0.82rem' }}>
            <i className="fas fa-chart-line text-primary" />
            <span>Painel de desempenho (KPIs, métricas, alertas)</span>
          </div>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-green-600 mb-3" style={{ fontSize: '0.85rem' }}>
            <i className="fas fa-circle-check" />
            <span>Relatório exportado com sucesso.</span>
          </div>
        ) : error ? (
          <p className="text-error mb-3" style={{ fontSize: '0.82rem' }}>{error}</p>
        ) : null}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-border text-foreground font-semibold" style={{ fontSize: '0.875rem' }}>
            Fechar
          </button>
          {!done && (
            <button type="button" onClick={handleExport} disabled={exporting} className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold" style={{ fontSize: '0.875rem' }}>
              {exporting ? <i className="fas fa-circle-notch fa-spin" /> : 'Exportar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ManagerProfile({ profileData }: Readonly<{ profileData: ManagerProfileResponse | null }>) {
  const [showExport, setShowExport] = useState(false);
  const [showCreateTech, setShowCreateTech] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [techLoading, setTechLoading] = useState(true);

  const loadTechnicians = () => {
    setTechLoading(true);
    fetchTechnicians()
      .then(setTechnicians)
      .catch(() => setTechnicians([]))
      .finally(() => setTechLoading(false));
  };

  useEffect(() => { loadTechnicians(); }, []);

  return (
    <>
      <SectionHeader icon="fa-chart-pie" title="Resumo Operacional" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-car"                value={String(profileData?.todayVehicles ?? 0)}  label="Veiculos hoje" color="var(--color-primary)" />
        <StatCard icon="fa-euro-sign"          value={`€${Number(profileData?.todayRevenue ?? 0).toFixed(2)}`} label="Receita hoje"  color="#22c55e" />
        <StatCard icon="fa-circle-exclamation" value={String(profileData?.openAlerts ?? 0)}    label="Alertas"       color="#f59e0b" />
      </div>

      <SectionHeader icon="fa-user-gear" title="Tecnicos" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>
            {techLoading ? '...' : `${technicians.length} técnico${technicians.length !== 1 ? 's' : ''}`}
          </span>
          <button
            type="button"
            onClick={() => setShowCreateTech(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-semibold"
            style={{ fontSize: '0.78rem' }}
          >
            <i className="fas fa-user-plus" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
            Novo Técnico
          </button>
        </div>
        {techLoading ? (
          <div className="flex justify-center py-4">
            <i className="fas fa-circle-notch fa-spin text-primary" aria-hidden="true" />
          </div>
        ) : technicians.length === 0 ? (
          <p className="text-center text-muted-foreground py-4" style={{ fontSize: '0.82rem' }}>
            Nenhum técnico registado
          </p>
        ) : (
          technicians.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <div className="h-px bg-border mx-4" />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-user-gear text-primary" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-semibold truncate" style={{ fontSize: '0.85rem' }}>{t.name}</p>
                  <p className="text-muted-foreground truncate" style={{ fontSize: '0.72rem' }}>{t.email}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <SectionHeader icon="fa-gear" title="Gestao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow to="/manager/dashboard"         icon="fa-chart-line"    label="Dashboard de Operacoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/manager/tariffs-incidents" icon="fa-tags"          label="Tarifas e Ocorrencias" />
        <div className="h-px bg-border mx-4" />
        <AccountRow onClick={() => setShowExport(true)} icon="fa-file-export" label="Exportar Relatorios" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Segurança" onClick={() => setShowPrivacy(true)} />
      </div>

      {showExport && <ExportReportsModal onClose={() => setShowExport(false)} />}
      {showPrivacy && <PrivacySecurityModal onClose={() => setShowPrivacy(false)} />}
      {showCreateTech && (
        <CreateTechnicianModal
          onClose={() => setShowCreateTech(false)}
          onCreated={loadTechnicians}
        />
      )}
    </>
  );
}

export function TechnicianProfile({ profileData }: Readonly<{ profileData: TechnicianProfileResponse | null }>) {
  const [parks, setParks] = useState<{ id: string; name: string; city: string }[]>([]);
  const [loadingParks, setLoadingParks] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    fetchMyAssignedParks()
      .then((assigned) => setParks(assigned.map(a => ({ id: a.parkingLotId, name: a.parkingLotName, city: a.parkingLotCity }))))
      .catch(() => setParks([]))
      .finally(() => setLoadingParks(false));
  }, []);

  return (
    <>
      <SectionHeader icon="fa-wrench" title="Estado dos Sensores" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon="fa-microchip"            value={String(profileData?.sensorSummary?.total ?? 0)}       label="Total"        color="#3b82f6" />
        <StatCard icon="fa-circle-check"         value={String(profileData?.sensorSummary?.operational ?? 0)} label="Operacionais" color="#22c55e" />
        <StatCard icon="fa-triangle-exclamation" value={String((profileData?.sensorSummary?.total ?? 0) - (profileData?.sensorSummary?.operational ?? 0))} label="Com Problemas" color="#f59e0b" />
      </div>

      <SectionHeader icon="fa-building" title="Parques" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        {loadingParks && (
          <div className="px-4 py-3 text-muted-foreground" style={{ fontSize: '0.82rem' }}>A carregar parques...</div>
        )}
        {!loadingParks && parks.length === 0 && (
          <div className="px-4 py-3 text-muted-foreground" style={{ fontSize: '0.82rem' }}>Sem parques disponíveis.</div>
        )}
        {!loadingParks && parks.map((park, idx) => (
          <div key={park.id}>
            {idx > 0 && <div className="h-px bg-border mx-4" />}
            <AccountRow icon="fa-square-parking" label={`${park.name} - ${park.city}`} />
          </div>
        ))}
      </div>

      <SectionHeader icon="fa-list-check" title="Manutencao" />
      <div className="rounded-2xl overflow-hidden mb-5 bg-card border border-border">
        <AccountRow to="/technician/maintenance?tab=tasks"    icon="fa-screwdriver-wrench" label="Ordens de Manutencao Abertas" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/technician/maintenance?tab=sensors"  icon="fa-microchip"          label="Diagnostico de Sensores" />
        <div className="h-px bg-border mx-4" />
        <AccountRow to="/technician/maintenance?tab=incidents" icon="fa-file-lines"         label="Historico de Intervencoes" />
        <div className="h-px bg-border mx-4" />
        <AccountRow icon="fa-shield-halved" label="Privacidade e Segurança" onClick={() => setShowPrivacy(true)} />
      </div>
      {showPrivacy && <PrivacySecurityModal onClose={() => setShowPrivacy(false)} />}
    </>
  );
}

function PrivacySecurityModal({ onClose }: Readonly<{ onClose: () => void }>) {
  return (
    <SimpleModal title="Privacidade e Segurança" onClose={onClose}>
      <div className="space-y-4" style={{ fontSize: '0.82rem' }}>

        <div>
          <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.85rem' }}>
            <i className="fas fa-lock text-primary mr-2" />Autenticação
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p><i className="fas fa-check-circle text-green-500 mr-2" />A sua conta é protegida por OAuth2 via Authentik.</p>
            <p><i className="fas fa-check-circle text-green-500 mr-2" />As sessões expiram automaticamente por inatividade.</p>
            <p><i className="fas fa-check-circle text-green-500 mr-2" />Todas as comunicações são cifradas via HTTPS.</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.85rem' }}>
            <i className="fas fa-database text-primary mr-2" />Dados Pessoais
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p><i className="fas fa-check-circle text-green-500 mr-2" />Os seus dados são armazenados de forma segura e não são partilhados com terceiros.</p>
            <p><i className="fas fa-check-circle text-green-500 mr-2" />O acesso aos dados é restrito por roles (condutor, técnico, gestor).</p>
            <p><i className="fas fa-check-circle text-green-500 mr-2" />Dados de localização apenas são usados quando ativa a funcionalidade.</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.85rem' }}>
            <i className="fas fa-bell text-primary mr-2" />Notificações
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p><i className="fas fa-check-circle text-green-500 mr-2" />Pode gerir as suas preferências de notificação no perfil.</p>
            <p><i className="fas fa-check-circle text-green-500 mr-2" />Notificações por email são opcionais e podem ser desativadas.</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div>
          <p className="text-foreground font-semibold mb-2" style={{ fontSize: '0.85rem' }}>
            <i className="fas fa-right-from-bracket text-primary mr-2" />Terminar Sessão
          </p>
          <p className="text-muted-foreground mb-3">Para terminar a sua sessão em todos os dispositivos, utilize o botão abaixo.</p>
          <button
            type="button"
            onClick={() => { onClose(); window.location.href = '/logout'; }}
            className="w-full py-2 rounded-xl border border-destructive text-destructive font-semibold hover:bg-destructive/10 transition-colors"
            style={{ fontSize: '0.85rem' }}
          >
            <i className="fas fa-right-from-bracket mr-2" />Terminar Sessão
          </button>
        </div>

      </div>
    </SimpleModal>
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
