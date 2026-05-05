import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentApi } from '../../../../services/apiService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

function PaymentForm({ onReady }: { onReady: (confirmed: boolean) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.origin + '/callback' },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message ?? 'Erro ao guardar método de pagamento.');
      setSaving(false);
      return;
    }

    setSaved(true);
    onReady(true);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-error font-semibold" style={{ fontSize: '0.8rem' }}>{error}</p>
      )}
      {saved ? (
        <div className="flex items-center gap-2 text-success font-semibold" style={{ fontSize: '0.85rem' }}>
          <i className="fas fa-circle-check" />
          Método de pagamento guardado
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !stripe}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:opacity-90 disabled:opacity-50 transition-all"
          style={{ fontSize: '0.875rem' }}
        >
          {saving ? <i className="fas fa-spinner fa-spin mr-2" /> : <i className="fas fa-lock mr-2" />}
          {saving ? 'A guardar...' : 'Guardar método de pagamento'}
        </button>
      )}
    </div>
  );
}

export function StepPaymentStripe({ onReady }: { onReady: (confirmed: boolean) => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    paymentApi.createSetupIntent()
      .then(setClientSecret)
      .catch(() => setLoadError('Não foi possível inicializar o pagamento. Podes configurar mais tarde no perfil.'));
  }, []);

  if (loadError) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-xl border border-warning/30 bg-warning/8 flex items-start gap-2">
          <i className="fas fa-triangle-exclamation text-warning mt-0.5 flex-shrink-0" style={{ fontSize: '0.85rem' }} />
          <p className="text-muted-foreground" style={{ fontSize: '0.8rem' }}>{loadError}</p>
        </div>
        <button
          type="button"
          onClick={() => onReady(false)}
          className="text-primary font-semibold hover:underline"
          style={{ fontSize: '0.82rem' }}
        >
          Continuar sem método de pagamento
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
        <i className="fas fa-spinner fa-spin" />
        <span style={{ fontSize: '0.85rem' }}>A inicializar pagamento seguro...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground" style={{ fontSize: '0.82rem' }}>
        O método de pagamento é guardado de forma segura pelo <strong>Stripe</strong> e usado para cobranças automáticas à saída do parque.
      </p>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm onReady={onReady} />
      </Elements>
    </div>
  );
}
