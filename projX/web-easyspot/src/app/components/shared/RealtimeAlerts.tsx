import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'sonner';
import { API_BASE } from '../../../services/apiBase';
import { useAuth } from '../../context/AuthContext';

type AlertTriggerEvent = {
  alertType?: string;
  parkId?: string;
  vehicleId?: string;
  message?: string;
  source?: string;
};

function alertLabel(alertType?: string): string {
  if (alertType === 'SPACE_AVAILABLE') return 'Lugar disponível';
  if (alertType === 'LOT_FULL') return 'Parque lotado';
  if (alertType === 'EV_CHARGER_AVAILABLE') return 'Carregador EV disponível';
  if (alertType === 'SENSOR_FAULT') return 'Falha de sensor';
  return 'Novo alerta';
}

export function RealtimeAlerts() {
  const { user, accessToken } = useAuth();

  useEffect(() => {
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
          toast.info(alertLabel(event.alertType), {
            description: event.message ?? `Parque ${event.parkId ?? 'N/D'}`,
          });
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
