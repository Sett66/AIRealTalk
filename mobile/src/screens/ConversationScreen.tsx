import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WS_EVENTS, type ServerWsEvent } from '@airealtalk/shared';
import { AudioWave } from '../components/AudioWave';
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
};

export function ConversationScreen({
  scenarioId,
  scenarioTitle,
  onBack,
}: ConversationScreenProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const phase = useSessionStore((state) => state.phase);
  const setPhase = useSessionStore((state) => state.setPhase);
  const resetPhase = useSessionStore((state) => state.resetPhase);
  const resetToIdleRef = useRef<() => void>(() => {});
  const setSpeakingRef = useRef<() => void>(() => {});

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

  const { status, sendEvent } = useWebSocket({
    scenarioId,
    onServerEvent: (event: ServerWsEvent) => {
      switch (event.type) {
        case WS_EVENTS.ASR_PARTIAL:
          setPartialText(event.payload.text);
          setErrorMessage(null);
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
            setPhase('processing');
          } else if (event.payload.phase === 'speaking') {
            setPhase('speaking');
            setSpeakingRef.current();
          }
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
        case WS_EVENTS.ERROR:
          setErrorMessage(event.payload.message);
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

  const wsColor =
    status === 'connected' ? '#16a34a' : status === 'connecting' ? '#ca8a04' : '#dc2626';

  const wsLabel =
    status === 'connected' ? '已连接' : status === 'connecting' ? '连接中' : '已断开';

  const handleExit = useCallback(() => {
    if (status === 'connected') {
      sendEvent(WS_EVENTS.SESSION_END, {});
    }
    resetPhase();
    onBack();
  }, [onBack, resetPhase, sendEvent, status]);

  const isBusy = phase === 'processing' || phase === 'speaking';
  const isListening = phase === 'listening';

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
        <Pressable
          onPress={handleExit}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="退出对话"
        >
          <Text style={styles.backText}>← 退出</Text>
        </Pressable>
        <Text style={styles.title}>{scenarioTitle}</Text>
        <View style={styles.statusRow}>
          <PhaseIndicator phase={phase} />
          <View style={styles.wsRow}>
            <View style={[styles.indicator, { backgroundColor: wsColor }]} />
            <Text style={[styles.wsText, { color: wsColor }]}>{wsLabel}</Text>
          </View>
        </View>
      </View>

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

      {!nativeAvailable && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            录音原生模块未加载。请执行 pnpm install 后重新构建：pnpm android
          </Text>
        </View>
      )}

      {permission === 'denied' && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            需要麦克风权限才能录音。请在系统设置中允许麦克风访问。
          </Text>
          <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
            <Text style={styles.permissionButtonText}>重新申请权限</Text>
          </Pressable>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <Pressable
        style={[
          styles.pttButton,
          isListening && styles.pttButtonActive,
          (status !== 'connected' || isBusy || !nativeAvailable) &&
            styles.pttButtonDisabled,
        ]}
        disabled={status !== 'connected' || isBusy || !nativeAvailable}
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
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    paddingRight: 12,
    marginBottom: 4,
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
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
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
