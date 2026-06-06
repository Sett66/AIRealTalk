import { z } from 'zod';

/** Client → Server WebSocket events (Issue #01 placeholders, SPEC §5.2) */
export const ClientWsEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session:connect'), payload: z.object({ scenarioId: z.string().optional() }) }),
  z.object({ type: z.literal('session:ping'), payload: z.object({}) }),
  z.object({ type: z.literal('audio:start'), payload: z.object({}) }),
  z.object({ type: z.literal('audio:chunk'), payload: z.object({ data: z.string() }) }),
  z.object({ type: z.literal('audio:end'), payload: z.object({}) }),
  z.object({ type: z.literal('session:end'), payload: z.object({}) }),
]);

/** Server → Client WebSocket events (Issue #01 placeholders, SPEC §5.2) */
export const ServerWsEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session:pong'), payload: z.object({}) }),
  z.object({ type: z.literal('session:phase'), payload: z.object({ phase: z.enum(['processing', 'speaking']) }) }),
  z.object({ type: z.literal('asr:partial'), payload: z.object({ text: z.string() }) }),
  z.object({ type: z.literal('asr:final'), payload: z.object({ text: z.string(), utteranceId: z.string() }) }),
  z.object({ type: z.literal('hint:show'), payload: z.object({ message: z.string(), severity: z.literal('major') }) }),
  z.object({ type: z.literal('tts:start'), payload: z.object({}) }),
  z.object({ type: z.literal('tts:chunk'), payload: z.object({ data: z.string() }) }),
  z.object({ type: z.literal('tts:end'), payload: z.object({}) }),
  z.object({ type: z.literal('report:ready'), payload: z.object({ report: z.record(z.unknown()) }) }),
  z.object({ type: z.literal('error'), payload: z.object({ code: z.string(), message: z.string() }) }),
]);

export type ClientWsEvent = z.infer<typeof ClientWsEventSchema>;
export type ServerWsEvent = z.infer<typeof ServerWsEventSchema>;
export type WsEvent = ClientWsEvent | ServerWsEvent;
