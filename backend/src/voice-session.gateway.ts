import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import type { WebSocket } from 'ws';
import {
  ClientWsEventSchema,
  WS_EVENTS,
  createServerEvent,
  type ClientWsEvent,
} from '@airealtalk/shared';
import { AsrService } from './asr/asr.service';

interface ClientSession {
  audioChunks: Buffer[];
  isRecording: boolean;
}

@WebSocketGateway({ path: '/', cors: { origin: '*' } })
export class VoiceSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VoiceSessionGateway.name);
  private readonly sessions = new WeakMap<WebSocket, ClientSession>();

  constructor(private readonly asrService: AsrService) {}

  handleConnection(client: WebSocket): void {
    this.logger.log('WebSocket client connected');
    this.sessions.set(client, { audioChunks: [], isRecording: false });

    client.on('message', (raw) => {
      void this.handleMessage(client, raw);
    });
  }

  handleDisconnect(client: WebSocket): void {
    this.sessions.delete(client);
    this.logger.log('WebSocket client disconnected');
  }

  private getSession(client: WebSocket): ClientSession {
    let session = this.sessions.get(client);
    if (!session) {
      session = { audioChunks: [], isRecording: false };
      this.sessions.set(client, session);
    }
    return session;
  }

  private send(client: WebSocket, type: Parameters<typeof createServerEvent>[0], payload: Parameters<typeof createServerEvent>[1]): void {
    client.send(JSON.stringify(createServerEvent(type, payload)));
  }

  private async handleMessage(client: WebSocket, raw: unknown): Promise<void> {
    try {
      const text = typeof raw === 'string' ? raw : raw?.toString();
      if (!text) {
        return;
      }

      const json: unknown = JSON.parse(text);
      const event = ClientWsEventSchema.parse(json);
      await this.dispatch(client, event);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid WebSocket message';
      this.logger.warn(`Failed to handle WS message: ${message}`);
      this.send(client, WS_EVENTS.ERROR, {
        code: 'INVALID_MESSAGE',
        message,
      });
    }
  }

  private async dispatch(client: WebSocket, event: ClientWsEvent): Promise<void> {
    switch (event.type) {
      case WS_EVENTS.SESSION_CONNECT:
        this.logger.log(
          `Session connect${event.payload.scenarioId ? `: ${event.payload.scenarioId}` : ''}`,
        );
        break;
      case WS_EVENTS.SESSION_PING:
        this.send(client, WS_EVENTS.SESSION_PONG, {});
        break;
      case WS_EVENTS.AUDIO_START:
        this.handleAudioStart(client);
        break;
      case WS_EVENTS.AUDIO_CHUNK:
        this.handleAudioChunk(client, event.payload.data);
        break;
      case WS_EVENTS.AUDIO_END:
        await this.handleAudioEnd(client);
        break;
      case WS_EVENTS.SESSION_END:
        this.logger.debug(`Session end received`);
        break;
      default: {
        const _exhaustive: never = event;
        return _exhaustive;
      }
    }
  }

  private handleAudioStart(client: WebSocket): void {
    const session = this.getSession(client);
    session.audioChunks = [];
    session.isRecording = true;
    this.logger.log('Audio recording started');
  }

  private handleAudioChunk(client: WebSocket, data: string): void {
    const session = this.getSession(client);
    if (!session.isRecording) {
      return;
    }
    session.audioChunks.push(Buffer.from(data, 'base64'));
  }

  private async handleAudioEnd(client: WebSocket): Promise<void> {
    const session = this.getSession(client);
    session.isRecording = false;

    if (session.audioChunks.length === 0) {
      this.send(client, WS_EVENTS.ERROR, {
        code: 'NO_AUDIO',
        message: 'No audio data received',
      });
      return;
    }

    const pcmBuffer = Buffer.concat(session.audioChunks);
    session.audioChunks = [];
    this.logger.log(`Audio recording ended (${pcmBuffer.length} bytes)`);

    this.send(client, WS_EVENTS.SESSION_PHASE, { phase: 'processing' });

    try {
      const result = await this.asrService.transcribe(pcmBuffer);

      for (const partial of result.partials) {
        this.send(client, WS_EVENTS.ASR_PARTIAL, { text: partial });
      }

      if (!result.final.trim()) {
        this.send(client, WS_EVENTS.ERROR, {
          code: 'ASR_EMPTY',
          message: '未识别到语音内容，请靠近麦克风再试一次',
        });
        return;
      }

      this.send(client, WS_EVENTS.ASR_FINAL, {
        text: result.final,
        utteranceId: randomUUID(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ASR transcription failed';
      this.logger.error(`ASR failed: ${message}`);
      this.send(client, WS_EVENTS.ERROR, {
        code: 'ASR_FAILED',
        message,
      });
    }
  }
}
