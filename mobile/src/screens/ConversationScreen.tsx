import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WS_EVENTS, type ServerWsEvent } from '@airealtalk/shared';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useWebSocket } from '../hooks/useWebSocket';

interface TranscriptEntry {
  id: string;
  text: string;
}

export function ConversationScreen() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resetToIdleRef = useRef<() => void>(() => {});

  const { status, sendEvent } = useWebSocket({
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
              { id: event.payload.utteranceId, text },
            ]);
          }
          resetToIdleRef.current();
          break;
        }
        case WS_EVENTS.ERROR:
          setErrorMessage(event.payload.message);
          resetToIdleRef.current();
          break;
        default:
          break;
      }
    },
  });

  const {
    permission,
    recordingState,
    nativeAvailable,
    requestPermission,
    startRecording,
    stopRecording,
    resetToIdle,
  } = useAudioRecorder({
    sendEvent,
    wsConnected: status === 'connected',
  });

  useEffect(() => {
    resetToIdleRef.current = resetToIdle;
  }, [resetToIdle]);

  const wsColor =
    status === 'connected' ? '#16a34a' : status === 'connecting' ? '#ca8a04' : '#dc2626';

  const wsLabel =
    status === 'connected' ? '已连接' : status === 'connecting' ? '连接中' : '已断开';

  const isRecording = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AIRealTalk</Text>
        <Text style={styles.subtitle}>Issue #03 · 按住说话 ASR 转写</Text>
        <View style={styles.wsRow}>
          <View style={[styles.indicator, { backgroundColor: wsColor }]} />
          <Text style={[styles.wsText, { color: wsColor }]}>{wsLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.transcriptArea} contentContainerStyle={styles.transcriptContent}>
        {transcripts.length === 0 && !partialText && (
          <Text style={styles.placeholder}>
            按住下方按钮说英文，例如：&quot;I&apos;d like a coffee please&quot;
          </Text>
        )}

        {transcripts.map((entry) => (
          <View key={entry.id} style={styles.bubble}>
            <Text style={styles.bubbleLabel}>你</Text>
            <Text style={styles.bubbleText}>{entry.text}</Text>
          </View>
        ))}

        {partialText && (
          <View style={styles.partialBubble}>
            <Text style={styles.partialLabel}>识别中…</Text>
            <Text style={styles.partialText}>{partialText}</Text>
          </View>
        )}

        {isProcessing && !partialText && (
          <Text style={styles.processingText}>正在转写…</Text>
        )}
      </ScrollView>

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
          isRecording && styles.pttButtonActive,
          (status !== 'connected' || isProcessing || !nativeAvailable) &&
            styles.pttButtonDisabled,
        ]}
        disabled={status !== 'connected' || isProcessing || !nativeAvailable}
        onPressIn={() => void startRecording()}
        onPressOut={() => void stopRecording()}
      >
        <Text style={styles.pttButtonText}>
          {isRecording ? '松手结束' : isProcessing ? '转写中…' : '按住说话'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  wsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
    marginBottom: 16,
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
  bubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  bubbleLabel: {
    fontSize: 11,
    color: '#3b82f6',
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
