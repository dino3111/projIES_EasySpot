import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useWs } from '../../context/WsContext';

type AlertTriggerEvent = {
  alertType?: string;
  parkId?: string;
  vehicleId?: string;
  message?: string;
  bookingCode?: string;
  source?: string;
};

function alertLabel(alertType?: string): string {
  if (alertType === 'RESERVATION_CONFIRMED') return 'Reserva confirmada';
  if (alertType === 'SPACE_AVAILABLE') return 'Lugar disponível';
  if (alertType === 'LOT_FULL') return 'Parque lotado';
  if (alertType === 'EV_CHARGER_AVAILABLE') return 'Carregador EV disponível';
  if (alertType === 'SENSOR_FAULT') return 'Falha de sensor';
  if (alertType === 'RESERVATION_CREATED') return 'Reserva confirmada';
  if (alertType === 'RESERVATION_UPDATED') return 'Reserva atualizada';
  if (alertType === 'RESERVATION_CANCELLED') return 'Reserva cancelada';
  return 'Novo alerta';
}

export function RealtimeAlerts() {
  const { user } = useAuth();
  const { client, status } = useWs();

  useEffect(() => {
    if (status !== 'connected' || !client || !user?.sub) return;

    const subscription = client.subscribe(`/topic/alerts/${user.sub}`, (frame) => {
      try {
        const event = JSON.parse(frame.body) as AlertTriggerEvent;
        const description = event.bookingCode
          ? `Código: ${event.bookingCode} · ${event.message ?? ''}`
          : (event.message ?? `Parque ${event.parkId ?? 'N/D'}`);
        const isReservationEvent = ['RESERVATION_CONFIRMED', 'RESERVATION_CREATED', 'RESERVATION_UPDATED', 'RESERVATION_CANCELLED']
          .includes(event.alertType ?? '');

        if (isReservationEvent) {
          toast.success(alertLabel(event.alertType), { description });
        } else {
          toast.info(alertLabel(event.alertType), { description });
        }
      } catch {
        toast.info('Novo alerta', { description: 'Recebeu uma notificação em tempo real.' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, status, user?.sub]);

  return null;
}
