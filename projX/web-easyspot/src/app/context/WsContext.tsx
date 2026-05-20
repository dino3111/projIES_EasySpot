import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE } from '../../services/apiBase';
import { useAuth } from './AuthContext';

export type WsStatus = 'connected' | 'connecting' | 'disconnected';

interface WsContextType {
  client: Client | null;
  status: WsStatus;
}

const WsContext = createContext<WsContextType | undefined>(undefined);

const realtimeAlertsDisabled = import.meta.env.VITE_DISABLE_REALTIME_ALERTS === 'true';

export function WsProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (realtimeAlertsDisabled) return;
    if (!user?.sub || !accessToken) {
      if (status !== 'disconnected') setStatus('disconnected');
      return;
    }

    const wsBase = API_BASE.replace(/\/api$/i, '');
    const stompClient = new Client({
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS(`${wsBase}/ws`),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
    });

    stompClient.onConnect = () => {
      console.info('[WS] connected sub=', user.sub);
      setStatus('connected');
    };

    stompClient.onStompError = (frame) => {
      console.warn('[WS] STOMP error', { headers: frame.headers, body: frame.body });
      setStatus('disconnected');
    };

    stompClient.onWebSocketError = (event) => {
      console.warn('[WS] socket error', event);
      setStatus('disconnected');
    };

    stompClient.onWebSocketClose = (event) => {
      console.info('[WS] socket close', { code: event?.code, reason: event?.reason });
      setStatus('disconnected');
    };

    setStatus('connecting');
    stompClient.activate();
    setClient(stompClient);

    return () => {
      stompClient.deactivate();
      setClient(null);
      setStatus('disconnected');
    };
  }, [user?.sub, accessToken]);

  const value = useMemo(() => ({ client, status }), [client, status]);

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function useWs() {
  const context = useContext(WsContext);
  if (context === undefined) {
    throw new Error('useWs must be used within a WsProvider');
  }
  return context;
}

export function useOptionalWs(): WsContextType {
  const context = useContext(WsContext);
  return context ?? { client: null, status: 'disconnected' };
}
