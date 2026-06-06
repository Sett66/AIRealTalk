import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ServerWsEventSchema,
  WS_EVENTS,
  createClientEvent,
  type ServerWsEvent,
} from '@airealtalk/shared';
import { WS_BASE_URL } from '../config';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const PING_INTERVAL_MS = 5000;
const PONG_TIMEOUT_MS = 500;

export function useWebSocket() {
  const [status, setStatus] = useState<WsConnectionStatus>('connecting');
  const [lastPongMs, setLastPongMs] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingSentAtRef = useRef<number | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const clearPingTimer = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sendPing = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    pingSentAtRef.current = Date.now();
    ws.send(JSON.stringify(createClientEvent(WS_EVENTS.SESSION_PING, {})));
  }, []);

  const handleServerEvent = useCallback((event: ServerWsEvent) => {
    if (event.type === WS_EVENTS.SESSION_PONG && pingSentAtRef.current) {
      setLastPongMs(Date.now() - pingSentAtRef.current);
      pingSentAtRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    clearReconnectTimer();
    clearPingTimer();

    const existing = wsRef.current;
    if (existing) {
      existing.onopen = null;
      existing.onclose = null;
      existing.onerror = null;
      existing.onmessage = null;
      existing.close();
      wsRef.current = null;
    }

    setStatus('connecting');
    const ws = new WebSocket(WS_BASE_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      ws.send(
        JSON.stringify(createClientEvent(WS_EVENTS.SESSION_CONNECT, {})),
      );
      sendPing();
      pingTimerRef.current = setInterval(sendPing, PING_INTERVAL_MS);
    };

    ws.onmessage = (message) => {
      try {
        const json: unknown = JSON.parse(String(message.data));
        const event = ServerWsEventSchema.parse(json);
        handleServerEvent(event);
      } catch {
        // Ignore malformed server events in debug UI
      }
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    ws.onclose = () => {
      clearPingTimer();
      setStatus('disconnected');

      if (shouldReconnectRef.current) {
        reconnectTimerRef.current = setTimeout(connect, 2000);
      }
    };
  }, [clearPingTimer, clearReconnectTimer, handleServerEvent, sendPing]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearPingTimer();
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [clearPingTimer, clearReconnectTimer, connect]);

  const pingNow = useCallback(() => {
    pingSentAtRef.current = Date.now();
    sendPing();
  }, [sendPing]);

  return {
    status,
    lastPongMs,
    pingNow,
    pongWithinBudget: lastPongMs !== null && lastPongMs <= PONG_TIMEOUT_MS,
  };
}
