import { z } from 'zod';

/** Canonical WS event type strings — use these instead of literals in app code */
export const WS_EVENTS = {
  SESSION_CONNECT: 'session:connect',
  SESSION_PING: 'session:ping',
  SESSION_PONG: 'session:pong',
  AUDIO_START: 'audio:start',
  AUDIO_CHUNK: 'audio:chunk',
  AUDIO_END: 'audio:end',
  SESSION_END: 'session:end',
  SESSION_PHASE: 'session:phase',
  ASR_PARTIAL: 'asr:partial',
  ASR_FINAL: 'asr:final',
  HINT_SHOW: 'hint:show',
  TTS_START: 'tts:start',
  TTS_CHUNK: 'tts:chunk',
  TTS_END: 'tts:end',
  REPORT_READY: 'report:ready',
  ERROR: 'error',
} as const;

/** Maps event type → payload shape (SPEC §5.2) */
export type WsEventMap = {
  [WS_EVENTS.SESSION_CONNECT]: { scenarioId?: string };
  [WS_EVENTS.SESSION_PING]: Record<string, never>;
  [WS_EVENTS.SESSION_PONG]: Record<string, never>;
  [WS_EVENTS.AUDIO_START]: Record<string, never>;
  [WS_EVENTS.AUDIO_CHUNK]: { data: string };
  [WS_EVENTS.AUDIO_END]: Record<string, never>;
  [WS_EVENTS.SESSION_END]: Record<string, never>;
  [WS_EVENTS.SESSION_PHASE]: { phase: 'processing' | 'speaking' };
  [WS_EVENTS.ASR_PARTIAL]: { text: string };
  [WS_EVENTS.ASR_FINAL]: { text: string; utteranceId: string };
  [WS_EVENTS.HINT_SHOW]: { message: string; severity: 'major' | 'minor' };
  [WS_EVENTS.TTS_START]: { reply: string };
  [WS_EVENTS.TTS_CHUNK]: { data: string };
  [WS_EVENTS.TTS_END]: Record<string, never>;
  [WS_EVENTS.REPORT_READY]: { report: Record<string, unknown> };
  [WS_EVENTS.ERROR]: { code: string; message: string };
};

export type ClientWsEventType =
  | typeof WS_EVENTS.SESSION_CONNECT
  | typeof WS_EVENTS.SESSION_PING
  | typeof WS_EVENTS.AUDIO_START
  | typeof WS_EVENTS.AUDIO_CHUNK
  | typeof WS_EVENTS.AUDIO_END
  | typeof WS_EVENTS.SESSION_END;

export type ServerWsEventType =
  | typeof WS_EVENTS.SESSION_PONG
  | typeof WS_EVENTS.SESSION_PHASE
  | typeof WS_EVENTS.ASR_PARTIAL
  | typeof WS_EVENTS.ASR_FINAL
  | typeof WS_EVENTS.HINT_SHOW
  | typeof WS_EVENTS.TTS_START
  | typeof WS_EVENTS.TTS_CHUNK
  | typeof WS_EVENTS.TTS_END
  | typeof WS_EVENTS.REPORT_READY
  | typeof WS_EVENTS.ERROR;

export type WsMessage<T extends keyof WsEventMap = keyof WsEventMap> = {
  type: T;
  payload: WsEventMap[T];
};

export function createClientEvent<T extends ClientWsEventType>(
  type: T,
  payload: WsEventMap[T],
): WsMessage<T> {
  return { type, payload };
}

export function createServerEvent<T extends ServerWsEventType>(
  type: T,
  payload: WsEventMap[T],
): WsMessage<T> {
  return { type, payload };
}

/** Client → Server WebSocket events (SPEC §5.2) */
export const ClientWsEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(WS_EVENTS.SESSION_CONNECT),
    payload: z.object({ scenarioId: z.string().optional() }),
  }),
  z.object({ type: z.literal(WS_EVENTS.SESSION_PING), payload: z.object({}) }),
  z.object({ type: z.literal(WS_EVENTS.AUDIO_START), payload: z.object({}) }),
  z.object({
    type: z.literal(WS_EVENTS.AUDIO_CHUNK),
    payload: z.object({ data: z.string() }),
  }),
  z.object({ type: z.literal(WS_EVENTS.AUDIO_END), payload: z.object({}) }),
  z.object({ type: z.literal(WS_EVENTS.SESSION_END), payload: z.object({}) }),
]);

/** Server → Client WebSocket events (SPEC §5.2) */
export const ServerWsEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(WS_EVENTS.SESSION_PONG), payload: z.object({}) }),
  z.object({
    type: z.literal(WS_EVENTS.SESSION_PHASE),
    payload: z.object({ phase: z.enum(['processing', 'speaking']) }),
  }),
  z.object({
    type: z.literal(WS_EVENTS.ASR_PARTIAL),
    payload: z.object({ text: z.string() }),
  }),
  z.object({
    type: z.literal(WS_EVENTS.ASR_FINAL),
    payload: z.object({ text: z.string(), utteranceId: z.string() }),
  }),
  z.object({
    type: z.literal(WS_EVENTS.HINT_SHOW),
    payload: z.object({
      message: z.string(),
      severity: z.enum(['major', 'minor']),
    }),
  }),
  z.object({
    type: z.literal(WS_EVENTS.TTS_START),
    payload: z.object({ reply: z.string() }),
  }),
  z.object({
    type: z.literal(WS_EVENTS.TTS_CHUNK),
    payload: z.object({ data: z.string() }),
  }),
  z.object({ type: z.literal(WS_EVENTS.TTS_END), payload: z.object({}) }),
  z.object({
    type: z.literal(WS_EVENTS.REPORT_READY),
    payload: z.object({ report: z.record(z.unknown()) }),
  }),
  z.object({
    type: z.literal(WS_EVENTS.ERROR),
    payload: z.object({ code: z.string(), message: z.string() }),
  }),
]);

export type ClientWsEvent = z.infer<typeof ClientWsEventSchema>;
export type ServerWsEvent = z.infer<typeof ServerWsEventSchema>;
export type WsEvent = ClientWsEvent | ServerWsEvent;
