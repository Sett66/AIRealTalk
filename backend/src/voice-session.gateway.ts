import { Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import type { LlmCorrection } from '@airealtalk/shared';
import { AsrService } from './asr/asr.service';
import { mergeInConversationHints } from './llm/hint.utils';
import { LlmService, type ChatMessage } from './llm/llm.service';
import { countWords, pcmDurationSec } from './report/report-metrics';
import { PronunciationService } from './pronunciation/pronunciation.service';
import type { PronunciationResult, TurnAudio } from './pronunciation/pronunciation.types';
import type { SessionReport } from '@airealtalk/shared';
import { ReportService } from './report/report.service';
import { ScenarioService } from './scenario/scenario.service';
import { TtsService } from './tts/tts.service';

interface PendingReportState {
  baseReport?: SessionReport;
  pronunciationResult?: PronunciationResult;
  reportSent: boolean;
  pronunciationTimedOut: boolean;
  waitTimeout?: ReturnType<typeof setTimeout>;
}

interface SessionState {
  sessionId: string;
  scenarioId: string;
  scenario: Scenario;
  messages: ChatMessage[];
  turnCount: number;
  userSpeakingDurationSec: number;
  userWordCount: number;
  turnCorrections: LlmCorrection[];
  turnAudios: TurnAudio[];
  audioChunks: Buffer[];
  isRecording: boolean;
  openingComplete: boolean;
  isSpeaking: boolean;
  pendingReport?: PendingReportState;
  isEndingSession: boolean;
}

@WebSocketGateway({ path: '/', cors: { origin: '*' } })
export class VoiceSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VoiceSessionGateway.name);
  private readonly sessions = new WeakMap<WebSocket, SessionState>();

  constructor(
    private readonly config: ConfigService,
    private readonly asrService: AsrService,
    private readonly llmService: LlmService,
    private readonly reportService: ReportService,
    private readonly pronunciationService: PronunciationService,
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
        await this.handleSessionEnd(client);
        break;
      case WS_EVENTS.PRONUNCIATION_SUBMIT:
        this.handlePronunciationSubmit(client, event.payload);
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
        sessionId: randomUUID(),
        scenarioId,
        scenario,
        messages: [{ role: 'assistant', content: scenario.openingLine }],
        turnCount: 0,
        userSpeakingDurationSec: 0,
        userWordCount: 0,
        turnCorrections: [],
        turnAudios: [],
        audioChunks: [],
        isRecording: false,
        openingComplete: false,
        isSpeaking: false,
        isEndingSession: false,
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
    session.userSpeakingDurationSec += pcmDurationSec(pcmBuffer.length);
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
      session.userWordCount += countWords(result.final);
      session.turnCount += 1;
      session.turnAudios.push({ text: result.final, pcm: pcmBuffer });

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
      session.turnCorrections.push(...llmResponse.corrections);

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

  private useMockPronunciation(): boolean {
    return this.config.get<string>('USE_MOCK_PRONUNCIATION') !== 'false';
  }

  private getPronunciationWaitMs(turnCount: number): number {
    const configured = Number(
      this.config.get<string>('PRONUNCIATION_WAIT_MS') ?? '20000',
    );
    const base =
      Number.isFinite(configured) && configured > 0 ? configured : 20_000;
    return Math.max(base, turnCount * 50_000);
  }

  private mergePronunciation(
    report: SessionReport,
    pronunciation: PronunciationResult,
  ): SessionReport {
    return {
      ...report,
      pronunciationAvg: pronunciation.pronunciationAvg,
      sentenceScores: pronunciation.sentenceScores,
    };
  }

  private clearPendingReportTimeout(pending: PendingReportState): void {
    if (pending.waitTimeout) {
      clearTimeout(pending.waitTimeout);
      pending.waitTimeout = undefined;
    }
  }

  private tryDeliverReport(client: WebSocket, session: SessionState): void {
    const pending = session.pendingReport;
    if (!pending?.baseReport) {
      return;
    }

    if (!pending.reportSent) {
      if (!pending.pronunciationResult && !pending.pronunciationTimedOut) {
        return;
      }

      const report = pending.pronunciationResult
        ? this.mergePronunciation(pending.baseReport, pending.pronunciationResult)
        : pending.baseReport;

      this.clearPendingReportTimeout(pending);
      pending.reportSent = true;
      this.send(client, WS_EVENTS.REPORT_READY, { report });
      this.logger.log(
        `Report ready for session=${session.sessionId} pronunciation=${Boolean(pending.pronunciationResult)}`,
      );
      session.isEndingSession = false;
      return;
    }

    if (pending.pronunciationResult) {
      const report = this.mergePronunciation(
        pending.baseReport,
        pending.pronunciationResult,
      );
      this.send(client, WS_EVENTS.REPORT_PRONUNCIATION_READY, { report });
      this.logger.log(
        `Pronunciation patch ready for session=${session.sessionId} avg=${pending.pronunciationResult.pronunciationAvg}`,
      );
      session.pendingReport = undefined;
      session.isEndingSession = false;
    }
  }

  private handlePronunciationSubmit(
    client: WebSocket,
    payload: {
      pronunciationAvg: number;
      sentenceScores: Array<{ text: string; score: number }>;
    },
  ): void {
    const session = this.sessions.get(client);
    if (!session) {
      this.logger.warn('Ignored pronunciation:submit without active session');
      return;
    }

    if (!session.pendingReport) {
      session.pendingReport = {
        reportSent: false,
        pronunciationTimedOut: false,
      };
    }

    session.pendingReport.pronunciationResult = {
      pronunciationAvg: payload.pronunciationAvg,
      sentenceScores: payload.sentenceScores,
    };

    this.logger.log(
      `Pronunciation submit received session=${session.sessionId} avg=${payload.pronunciationAvg}`,
    );

    this.tryDeliverReport(client, session);
  }

  private async handleSessionEnd(client: WebSocket): Promise<void> {
    const session = this.sessions.get(client);
    if (!session) {
      this.send(client, WS_EVENTS.ERROR, {
        code: 'NO_SESSION',
        message: '会话未初始化，无法生成报告',
      });
      return;
    }

    if (session.turnCount === 0) {
      this.send(client, WS_EVENTS.ERROR, {
        code: 'REPORT_NO_TURNS',
        message: '至少完成一轮对话后才能生成报告',
      });
      return;
    }

    if (session.isEndingSession) {
      return;
    }

    session.isEndingSession = true;

    this.logger.log(
      `Generating report for session=${session.sessionId} turns=${session.turnCount}`,
    );

    if (!this.useMockPronunciation()) {
      const existingResult = session.pendingReport?.pronunciationResult;
      session.pendingReport = {
        reportSent: false,
        pronunciationTimedOut: false,
        pronunciationResult: existingResult,
      };
      if (!session.pendingReport.waitTimeout) {
        session.pendingReport.waitTimeout = setTimeout(() => {
        const pending = session.pendingReport;
        if (!pending || pending.reportSent) {
          return;
        }

        pending.pronunciationTimedOut = true;
        this.logger.warn(
          `Pronunciation wait timeout for session=${session.sessionId}`,
        );
        this.tryDeliverReport(client, session);
      }, this.getPronunciationWaitMs(session.turnCount));
      }
    }

    try {
      const report = await this.reportService.generateReport({
        sessionId: session.sessionId,
        scenario: session.scenario,
        messages: session.messages,
        turnCount: session.turnCount,
        durationSec: session.userSpeakingDurationSec,
        userWordCount: session.userWordCount,
        accumulatedCorrections: session.turnCorrections,
      });

      if (this.useMockPronunciation()) {
        let enrichedReport = report;
        try {
          const pronunciation = await this.pronunciationService.evaluateSession(
            session.turnAudios,
          );
          enrichedReport = this.mergePronunciation(report, pronunciation);
          this.logger.log(
            `Pronunciation ready avg=${pronunciation.pronunciationAvg}`,
          );
        } catch (pronunciationError) {
          const message =
            pronunciationError instanceof Error
              ? pronunciationError.message
              : 'Pronunciation evaluation failed';
          this.logger.warn(
            `Pronunciation skipped for session=${session.sessionId}: ${message}`,
          );
        }

        this.send(client, WS_EVENTS.REPORT_READY, { report: enrichedReport });
        this.logger.log(`Report ready for session=${session.sessionId}`);
        session.isEndingSession = false;
        return;
      }

      session.pendingReport = {
        ...session.pendingReport,
        baseReport: report,
        reportSent: session.pendingReport?.reportSent ?? false,
        pronunciationTimedOut:
          session.pendingReport?.pronunciationTimedOut ?? false,
        pronunciationResult: session.pendingReport?.pronunciationResult,
        waitTimeout: session.pendingReport?.waitTimeout,
      };

      this.tryDeliverReport(client, session);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Report generation failed';
      this.logger.error(`Report failed: ${message}`);
      session.pendingReport = undefined;
      session.isEndingSession = false;
      this.send(client, WS_EVENTS.ERROR, {
        code: 'REPORT_FAILED',
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
