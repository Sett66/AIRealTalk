import { Logger, NotFoundException } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import type { WebSocket } from 'ws';
import type { Scenario } from '@airealtalk/shared';
import {
  ClientWsEventSchema,
  WS_EVENTS,
  createServerEvent,
  type ClientWsEvent,
} from '@airealtalk/shared';
import { AsrService } from './asr/asr.service';
import { mergeInConversationHints } from './llm/hint.utils';
import { LlmService, type ChatMessage } from './llm/llm.service';
import { ScenarioService } from './scenario/scenario.service';
import { TtsService } from './tts/tts.service';

interface SessionState {
  scenarioId: string;
  scenario: Scenario;
  messages: ChatMessage[];
  turnCount: number;
  audioChunks: Buffer[];
  isRecording: boolean;
  openingComplete: boolean;
  isSpeaking: boolean;
}

@WebSocketGateway({ path: '/', cors: { origin: '*' } })
export class VoiceSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VoiceSessionGateway.name);
  private readonly sessions = new WeakMap<WebSocket, SessionState>();

  constructor(
    private readonly asrService: AsrService,
    private readonly llmService: LlmService,
    private readonly ttsService: TtsService,
    private readonly scenarioService: ScenarioService,
  ) {}

  handleConnection(client: WebSocket): void {
    this.logger.log('WebSocket client connected');

    client.on('message', (raw) => {
      void this.handleMessage(client, raw);
    });
  }

  handleDisconnect(client: WebSocket): void {
    const session = this.sessions.get(client);
    if (session) {
      this.logger.log(
        `Session ended: scenario=${session.scenarioId} turns=${session.turnCount} messages=${session.messages.length}`,
      );
    }
    this.sessions.delete(client);
    this.logger.log('WebSocket client disconnected');
  }

  private getSession(client: WebSocket): SessionState {
    const session = this.sessions.get(client);
    if (!session) {
      throw new Error('Session not initialized — send session:connect first');
    }
    return session;
  }

  private send(
    client: WebSocket,
    type: Parameters<typeof createServerEvent>[0],
    payload: Parameters<typeof createServerEvent>[1],
  ): void {
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

  private async dispatch(
    client: WebSocket,
    event: ClientWsEvent,
  ): Promise<void> {
    switch (event.type) {
      case WS_EVENTS.SESSION_CONNECT:
        await this.handleSessionConnect(
          client,
          event.payload.scenarioId ?? 'interview',
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

  private async handleSessionConnect(
    client: WebSocket,
    scenarioId: string,
  ): Promise<void> {
    try {
      const scenario = this.scenarioService.getById(scenarioId);
      const session: SessionState = {
        scenarioId,
        scenario,
        messages: [{ role: 'assistant', content: scenario.openingLine }],
        turnCount: 0,
        audioChunks: [],
        isRecording: false,
        openingComplete: false,
        isSpeaking: false,
      };
      this.sessions.set(client, session);

      this.logger.log(
        `Session connect: scenario=${scenarioId} opening="${scenario.openingLine}"`,
      );

      await this.playTts(client, scenario.openingLine);
      session.openingComplete = true;
    } catch (error) {
      const message =
        error instanceof NotFoundException
          ? `Unknown scenario: ${scenarioId}`
          : error instanceof Error
            ? error.message
            : 'Failed to start session';
      this.logger.error(`Session connect failed: ${message}`);
      this.send(client, WS_EVENTS.ERROR, {
        code: 'SESSION_CONNECT_FAILED',
        message,
      });
    }
  }

  private handleAudioStart(client: WebSocket): void {
    const session = this.getSession(client);
    if (!session.openingComplete || session.isSpeaking) {
      return;
    }
    session.audioChunks = [];
    session.isRecording = true;
    this.logger.log('Audio recording started');
  }

  private handleAudioChunk(client: WebSocket, data: string): void {
    const session = this.getSession(client);
    if (!session.isRecording || !session.openingComplete || session.isSpeaking) {
      return;
    }
    session.audioChunks.push(Buffer.from(data, 'base64'));
  }

  private async handleAudioEnd(client: WebSocket): Promise<void> {
    const session = this.getSession(client);
    session.isRecording = false;

    if (!session.openingComplete) {
      this.send(client, WS_EVENTS.ERROR, {
        code: 'OPENING_IN_PROGRESS',
        message: '请等待面试官说完开场白后再发言',
      });
      return;
    }

    if (session.isSpeaking) {
      return;
    }

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

      const utteranceId = randomUUID();
      this.send(client, WS_EVENTS.ASR_FINAL, {
        text: result.final,
        utteranceId,
      });

      session.messages.push({ role: 'user', content: result.final });
      session.turnCount += 1;

      this.logger.log(
        `Turn ${session.turnCount}: user="${result.final}" history=${session.messages.length} messages`,
      );

      await this.runLlmAndTts(client, session);
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

  private async runLlmAndTts(
    client: WebSocket,
    session: SessionState,
  ): Promise<void> {
    try {
      const llmResponse = await this.llmService.generateReply(
        session.messages,
        session.scenario,
      );
      session.messages.push({
        role: 'assistant',
        content: llmResponse.reply,
      });

      this.logger.log(
        `LLM reply turn ${session.turnCount} (${llmResponse.reply.length} chars)`,
      );

      const lastUserMessage = [...session.messages]
        .reverse()
        .find((message) => message.role === 'user');
      const hints = mergeInConversationHints(
        llmResponse.hints,
        lastUserMessage?.content ?? '',
        this.logger,
      );

      for (const hint of hints) {
        this.send(client, WS_EVENTS.HINT_SHOW, {
          message: hint.message,
          severity: hint.severity,
        });
      }

      await this.playTts(client, llmResponse.reply);
    } catch (error) {
      const lastMessage = session.messages.at(-1);
      if (lastMessage?.role === 'user') {
        session.messages.pop();
        session.turnCount = Math.max(0, session.turnCount - 1);
        this.logger.warn(
          `Rolled back failed turn; history=${session.messages.length} messages`,
        );
      }

      const message =
        error instanceof Error ? error.message : 'LLM/TTS pipeline failed';
      this.logger.error(`LLM/TTS failed: ${message}`);
      this.send(client, WS_EVENTS.ERROR, {
        code: 'PIPELINE_FAILED',
        message,
      });
    }
  }

  private async playTts(client: WebSocket, reply: string): Promise<void> {
    const session = this.getSession(client);
    session.isSpeaking = true;

    try {
      this.send(client, WS_EVENTS.SESSION_PHASE, { phase: 'speaking' });
      this.send(client, WS_EVENTS.TTS_START, { reply });

      await this.ttsService.synthesize(reply, (chunk) => {
        this.send(client, WS_EVENTS.TTS_CHUNK, {
          data: chunk.toString('base64'),
        });
      });

      this.send(client, WS_EVENTS.TTS_END, {});
    } finally {
      session.isSpeaking = false;
    }
  }
}
