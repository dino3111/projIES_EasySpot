import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'sonner';
import { API_BASE } from '../../../services/apiBase';
import { useAuth } from '../../context/AuthContext';

const realtimeAlertsDisabled = import.meta.env.VITE_DISABLE_REALTIME_ALERTS === 'true';

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
  const { user, accessToken } = useAuth();

  useEffect(() => {
    if (realtimeAlertsDisabled) return;
    if (!user?.sub || !accessToken) return;

    const wsBase = API_BASE.replace(/\/api$/i, '');
    const client = new Client({
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(`${wsBase}/ws`),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
    });

    client.onConnect = () => {
      console.info('[WS] connected sub=', user.sub);
      client.subscribe(`/topic/alerts/${user.sub}`, (frame) => {
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
    };

    client.onStompError = (frame) => {
      console.warn('[WS] STOMP error', { headers: frame.headers, body: frame.body });
    };
    client.onWebSocketError = (event) => {
      console.warn('[WS] socket error', event);
    };
    client.onWebSocketClose = (event) => {
      console.info('[WS] socket close', { code: event?.code, reason: event?.reason });
    };

    client.activate();
    return () => client.deactivate();
  }, [user?.sub, accessToken]);

  return null;
}
