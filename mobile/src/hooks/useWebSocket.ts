import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ServerWsEventSchema,
  WS_EVENTS,
  createClientEvent,
  type ClientWsEventType,
  type ServerWsEvent,
  type WsEventMap,
} from '@airealtalk/shared';
import { WS_BASE_URL } from '../config';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const PING_INTERVAL_MS = 5000;
const PONG_TIMEOUT_MS = 500;

type UseWebSocketOptions = {
  scenarioId: string;
  enabled?: boolean;
  onServerEvent?: (event: ServerWsEvent) => void;
};

export function useWebSocket(options: UseWebSocketOptions) {
  const { scenarioId, enabled = true, onServerEvent } = options;
  const [status, setStatus] = useState<WsConnectionStatus>(
    enabled ? 'connecting' : 'disconnected',
  );
  const [lastPongMs, setLastPongMs] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingSentAtRef = useRef<number | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const onServerEventRef = useRef(onServerEvent);

  useEffect(() => {
    onServerEventRef.current = onServerEvent;
  }, [onServerEvent]);

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

  const sendEvent = useCallback(
    <T extends ClientWsEventType>(type: T, payload: WsEventMap[T]): boolean => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return false;
      }
      ws.send(JSON.stringify(createClientEvent(type, payload)));
      return true;
    },
    [],
  );

  const handleServerEvent = useCallback((event: ServerWsEvent) => {
    if (event.type === WS_EVENTS.SESSION_PONG && pingSentAtRef.current) {
      setLastPongMs(Date.now() - pingSentAtRef.current);
      pingSentAtRef.current = null;
    }
    onServerEventRef.current?.(event);
  }, []);

  const connect = useCallback(() => {
    if (!enabled) {
      return;
    }

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
        JSON.stringify(
          createClientEvent(WS_EVENTS.SESSION_CONNECT, { scenarioId }),
        ),
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
        // Ignore malformed server events
      }
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    ws.onclose = () => {
      clearPingTimer();
      setStatus('disconnected');

      if (shouldReconnectRef.current && enabled) {
        reconnectTimerRef.current = setTimeout(connect, 2000);
      }
    };
  }, [
    clearPingTimer,
    clearReconnectTimer,
    enabled,
    handleServerEvent,
    scenarioId,
    sendPing,
  ]);

  useEffect(() => {
    shouldReconnectRef.current = enabled;

    if (!enabled) {
      clearPingTimer();
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
      setStatus('disconnected');
      return;
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearPingTimer();
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [clearPingTimer, clearReconnectTimer, connect, enabled]);

  const pingNow = useCallback(() => {
    pingSentAtRef.current = Date.now();
    sendPing();
  }, [sendPing]);

  return {
    status,
    lastPongMs,
    pingNow,
    sendEvent,
    pongWithinBudget: lastPongMs !== null && lastPongMs <= PONG_TIMEOUT_MS,
  };
}
