import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  WS_EVENTS,
  type ServerWsEvent,
  type SessionReport,
} from '@airealtalk/shared';
import { AudioWave } from '../components/AudioWave';
import { HintBubble, type HintEntry } from '../components/HintBubble';
import { MicPermissionGuide } from '../components/MicPermissionGuide';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { ScreenContainer } from '../components/ScreenContainer';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTtsPlayer } from '../hooks/useTtsPlayer';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSessionStore } from '../stores/session-store';

interface TranscriptEntry {
  id: string;
  text: string;
  role: 'user' | 'assistant';
}

type ConversationScreenProps = {
  scenarioId: string;
  scenarioTitle: string;
  onBack: () => void;
  onReportReady: (report: SessionReport) => void;
};

const PROCESSING_TIMEOUT_MS = 35_000;
const RETRYABLE_ERROR_CODES = new Set([
  'ASR_FAILED',
  'ASR_EMPTY',
  'PIPELINE_FAILED',
  'PROCESSING_TIMEOUT',
]);

export function ConversationScreen({
  scenarioId,
  scenarioTitle,
  onBack,
  onReportReady,
}: ConversationScreenProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [hints, setHints] = useState<HintEntry[]>([]);
  const phase = useSessionStore((state) => state.phase);
  const setPhase = useSessionStore((state) => state.setPhase);
  const resetPhase = useSessionStore((state) => state.resetPhase);
  const resetToIdleRef = useRef<() => void>(() => {});
  const setSpeakingRef = useRef<() => void>(() => {});
  const onReportReadyRef = useRef(onReportReady);
  const isGeneratingReportRef = useRef(false);

  useEffect(() => {
    onReportReadyRef.current = onReportReady;
  }, [onReportReady]);

  useEffect(() => {
    isGeneratingReportRef.current = isGeneratingReport;
  }, [isGeneratingReport]);

  useEffect(() => {
    resetPhase();
    return () => resetPhase();
  }, [resetPhase, scenarioId]);

  const { onTtsStart, onTtsChunk, onTtsEnd } = useTtsPlayer({
    onPlaybackComplete: () => {
      resetPhase();
      resetToIdleRef.current();
    },
  });

  const { status, reconnectAttempt, reconnectExhausted, reconnect, sendEvent } =
    useWebSocket({
    scenarioId,
    onServerEvent: (event: ServerWsEvent) => {
      switch (event.type) {
        case WS_EVENTS.ASR_PARTIAL:
          setPartialText(event.payload.text);
          setErrorMessage(null);
          setLastErrorCode(null);
          break;
        case WS_EVENTS.ASR_FINAL: {
          setPartialText(null);
          const text = event.payload.text.trim();
          if (text) {
            setTranscripts((prev) => [
              ...prev,
              { id: event.payload.utteranceId, text, role: 'user' },
            ]);
          }
          break;
        }
        case WS_EVENTS.SESSION_PHASE:
          if (event.payload.phase === 'processing') {
            setHints([]);
            setPhase('processing');
          } else if (event.payload.phase === 'speaking') {
            setPhase('speaking');
            setSpeakingRef.current();
          }
          break;
        case WS_EVENTS.HINT_SHOW:
          setHints((prev) => [
            ...prev,
            {
              message: event.payload.message,
              severity: event.payload.severity,
            },
          ]);
          break;
        case WS_EVENTS.TTS_START: {
          const reply = event.payload.reply.trim();
          if (reply) {
            setTranscripts((prev) => [
              ...prev,
              { id: `ai-${Date.now()}`, text: reply, role: 'assistant' },
            ]);
          }
          setPhase('speaking');
          void onTtsStart();
          break;
        }
        case WS_EVENTS.TTS_CHUNK:
          void onTtsChunk(event.payload.data);
          break;
        case WS_EVENTS.TTS_END:
          onTtsEnd();
          break;
        case WS_EVENTS.REPORT_READY:
          setIsGeneratingReport(false);
          setReportError(null);
          onReportReadyRef.current(event.payload.report);
          break;
        case WS_EVENTS.ERROR:
          if (isGeneratingReportRef.current) {
            setReportError(event.payload.message);
            setIsGeneratingReport(false);
            break;
          }
          setErrorMessage(event.payload.message);
          setLastErrorCode(event.payload.code);
          resetPhase();
          resetToIdleRef.current();
          break;
        default:
          break;
      }
    },
  });

  const {
    permission,
    nativeAvailable,
    requestPermission,
    startRecording,
    stopRecording,
    resetToIdle,
    setSpeaking,
  } = useAudioRecorder({
    sendEvent,
    wsConnected: status === 'connected',
    onRecordingStart: () => setPhase('listening'),
    onRecordingStop: () => setPhase('processing'),
  });

  useEffect(() => {
    resetToIdleRef.current = resetToIdle;
    setSpeakingRef.current = setSpeaking;
  }, [resetToIdle, setSpeaking]);

  useEffect(() => {
    if (phase !== 'processing') {
      return;
    }

    const timer = setTimeout(() => {
      setErrorMessage('处理超时，请检查网络后按住按钮重试');
      setLastErrorCode('PROCESSING_TIMEOUT');
      resetPhase();
      resetToIdleRef.current();
    }, PROCESSING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [phase, resetPhase]);

  const micDenied =
    permission === 'denied' || permission === 'blocked';

  const wsColor =
    status === 'connected' ? '#16a34a' : status === 'connecting' ? '#ca8a04' : '#dc2626';

  const wsLabel =
    reconnectExhausted
      ? '连接失败'
      : status === 'connected'
        ? '已连接'
        : status === 'connecting' && reconnectAttempt > 0
          ? `重连中 (${reconnectAttempt}/5)`
          : status === 'connecting'
            ? '连接中'
            : '已断开';

  const isBusy = phase === 'processing' || phase === 'speaking';
  const isListening = phase === 'listening';

  const handleExit = useCallback(() => {
    resetPhase();
    onBack();
  }, [onBack, resetPhase]);

  const handleEndPractice = useCallback(() => {
    if (status !== 'connected' || isBusy || isGeneratingReport) {
      return;
    }

    setReportError(null);
    setIsGeneratingReport(true);
    const sent = sendEvent(WS_EVENTS.SESSION_END, {});
    if (!sent) {
      setIsGeneratingReport(false);
      setReportError('连接已断开，请检查后重试');
    }
  }, [isBusy, isGeneratingReport, sendEvent, status]);

  const handleRetryTurn = useCallback(() => {
    setErrorMessage(null);
    setLastErrorCode(null);
    resetPhase();
    resetToIdle();
  }, [resetPhase, resetToIdle]);

  const canRetryTurn =
    lastErrorCode !== null && RETRYABLE_ERROR_CODES.has(lastErrorCode);

  const handleRetryReport = useCallback(() => {
    handleEndPractice();
  }, [handleEndPractice]);

  const pttLabel = isListening
    ? '松手结束'
    : phase === 'speaking'
      ? 'AI 正在说话…'
      : phase === 'processing'
        ? '处理中…'
        : '按住说话';

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleExit}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="退出对话"
          >
            <Text style={styles.backText}>← 退出</Text>
          </Pressable>
          <Pressable
            onPress={handleEndPractice}
            hitSlop={8}
            style={[
              styles.endPracticeButton,
              (status !== 'connected' || isBusy || isGeneratingReport) &&
                styles.endPracticeButtonDisabled,
            ]}
            disabled={status !== 'connected' || isBusy || isGeneratingReport}
            accessibilityRole="button"
            accessibilityLabel="结束练习"
          >
            <Text style={styles.endPracticeText}>结束练习</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{scenarioTitle}</Text>
        <View style={styles.statusRow}>
          <PhaseIndicator phase={phase} />
          <View style={styles.wsRow}>
            <View style={[styles.indicator, { backgroundColor: wsColor }]} />
            <Text style={[styles.wsText, { color: wsColor }]}>{wsLabel}</Text>
          </View>
        </View>
      </View>

      <HintBubble
        hints={hints}
        visible={hints.length > 0 && !micDenied}
        onDismiss={() => setHints([])}
      />

      {reconnectExhausted && (
        <View style={styles.reconnectBanner}>
          <Text style={styles.reconnectText}>
            无法连接服务器，已自动重试 5 次。请确认 backend 已启动且网络正常。
          </Text>
          <Pressable style={styles.retryButton} onPress={reconnect}>
            <Text style={styles.retryButtonText}>手动重连</Text>
          </Pressable>
        </View>
      )}

      {micDenied && nativeAvailable ? (
        <MicPermissionGuide
          blocked={permission === 'blocked'}
          onRetry={() => void requestPermission()}
        />
      ) : (
        <>
      <ScrollView style={styles.transcriptArea} contentContainerStyle={styles.transcriptContent}>
        {transcripts.length === 0 && !partialText && (
          <Text style={styles.placeholder}>
            连接后将自动播放 AI 开场白。准备好后按住按钮开始对话。
          </Text>
        )}

        {transcripts.map((entry) => (
          <View
            key={entry.id}
            style={entry.role === 'user' ? styles.userBubble : styles.aiBubble}
          >
            <Text style={entry.role === 'user' ? styles.userLabel : styles.aiLabel}>
              {entry.role === 'user' ? '你' : 'AI'}
            </Text>
            <Text style={styles.bubbleText}>{entry.text}</Text>
          </View>
        ))}

        {partialText && (
          <View style={styles.partialBubble}>
            <Text style={styles.partialLabel}>识别中…</Text>
            <Text style={styles.partialText}>{partialText}</Text>
          </View>
        )}

        {phase === 'processing' && !partialText && (
          <Text style={styles.processingText}>正在转写与生成回复…</Text>
        )}
      </ScrollView>

      {isListening && (
        <View style={styles.waveContainer}>
          <AudioWave active />
        </View>
      )}
        </>
      )}

      {!nativeAvailable && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            录音原生模块未加载。请执行 pnpm install 后重新构建：pnpm android
          </Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          {canRetryTurn && (
            <Pressable style={styles.retryButton} onPress={handleRetryTurn}>
              <Text style={styles.retryButtonText}>重试</Text>
            </Pressable>
          )}
        </View>
      )}

      {reportError && (
        <View style={styles.reportErrorBanner}>
          <Text style={styles.reportErrorText}>{reportError}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetryReport}>
            <Text style={styles.retryButtonText}>重试生成报告</Text>
          </Pressable>
        </View>
      )}

      {isGeneratingReport && (
        <View style={styles.reportLoadingBanner}>
          <Text style={styles.reportLoadingText}>正在生成课后报告…</Text>
        </View>
      )}

      <Pressable
        style={[
          styles.pttButton,
          isListening && styles.pttButtonActive,
          (status !== 'connected' ||
            isBusy ||
            !nativeAvailable ||
            micDenied ||
            reconnectExhausted) &&
            styles.pttButtonDisabled,
        ]}
        disabled={
          status !== 'connected' ||
          isBusy ||
          !nativeAvailable ||
          micDenied ||
          reconnectExhausted
        }
        onPressIn={() => void startRecording()}
        onPressOut={() => void stopRecording()}
      >
        <Text style={styles.pttButtonText}>{pttLabel}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 16,
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    paddingRight: 12,
  },
  endPracticeButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
  },
  endPracticeButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  endPracticeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  backText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  wsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  wsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  transcriptArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  transcriptContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  placeholder: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 40,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  userLabel: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 2,
  },
  aiLabel: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
  },
  partialBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  partialLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  partialText: {
    fontSize: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  processingText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  waveContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  permissionText: {
    color: '#92400e',
    fontSize: 13,
    lineHeight: 20,
  },
  permissionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  reconnectBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  reconnectText: {
    color: '#92400e',
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  reportErrorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reportErrorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  reportLoadingBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  reportLoadingText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pttButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  pttButtonActive: {
    backgroundColor: '#dc2626',
  },
  pttButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  pttButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
