import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { WS_EVENTS } from '@airealtalk/shared';
import AudioRecord from 'react-native-audio-record';
import { splitBase64 } from '../utils/chunk-base64';
import { readFileAsBase64 } from '../utils/read-file-base64';
import { useTurnAudioStore } from '../stores/turn-audio-store';
import { requestMicPermission, type MicPermissionStatus } from '../utils/audio-permission';
import type { useWebSocket } from './useWebSocket';

type SendEvent = ReturnType<typeof useWebSocket>['sendEvent'];

export type RecordingState = 'idle' | 'recording' | 'processing' | 'speaking';

const isNativeAudioAvailable = NativeModules.RNAudioRecord != null;

type UseAudioRecorderOptions = {
  sendEvent: SendEvent;
  wsConnected: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
};

export function useAudioRecorder({
  sendEvent,
  wsConnected,
  onRecordingStart,
  onRecordingStop,
}: UseAudioRecorderOptions) {
  const [permission, setPermission] = useState<MicPermissionStatus | 'unknown'>('unknown');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const initializedRef = useRef(false);
  const sendEventRef = useRef(sendEvent);

  useEffect(() => {
    sendEventRef.current = sendEvent;
  }, [sendEvent]);

  useEffect(() => {
    void requestMicPermission().then(setPermission);

    if (!isNativeAudioAvailable || initializedRef.current) {
      return;
    }

    AudioRecord.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: 'airealtalk-recording.wav',
    });

    initializedRef.current = true;
  }, []);

  const abortRecording = useCallback(async () => {
    if (!isNativeAudioAvailable || !isRecordingRef.current || isStoppingRef.current) {
      return;
    }

    isStoppingRef.current = true;
    isRecordingRef.current = false;
    try {
      await AudioRecord.stop();
    } catch {
      // 页面退出或重复 stop 时原生层可能抛错，忽略以避免 AudioRecord 崩溃
    } finally {
      isStoppingRef.current = false;
      setRecordingState('idle');
    }
  }, []);

  useEffect(() => {
    return () => {
      void abortRecording();
    };
  }, [abortRecording]);

  const requestPermission = useCallback(async () => {
    const result = await requestMicPermission();
    setPermission(result);
    return result;
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isNativeAudioAvailable || !wsConnected) {
      return false;
    }

    if (isRecordingRef.current || isStoppingRef.current) {
      return false;
    }

    let micPermission = permission;
    if (micPermission !== 'granted') {
      micPermission = await requestPermission();
    }

    if (micPermission !== 'granted') {
      return false;
    }

    const started = sendEvent(WS_EVENTS.AUDIO_START, {});
    if (!started) {
      return false;
    }

    isRecordingRef.current = true;
    setRecordingState('recording');
    onRecordingStart?.();
    try {
      AudioRecord.start();
      return true;
    } catch {
      isRecordingRef.current = false;
      setRecordingState('idle');
      return false;
    }
  }, [onRecordingStart, permission, requestPermission, sendEvent, wsConnected]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current || isStoppingRef.current) {
      return;
    }

    isStoppingRef.current = true;
    isRecordingRef.current = false;
    setRecordingState('processing');
    onRecordingStop?.();

    try {
      const wavPath = await AudioRecord.stop();
      const normalizedPath = wavPath.startsWith('file://')
        ? wavPath.slice('file://'.length)
        : wavPath;
      const uniquePath = `${RNFS.CachesDirectoryPath}/airealtalk-turn-${Date.now()}.wav`;
      await RNFS.copyFile(normalizedPath, uniquePath);
      useTurnAudioStore.getState().setPendingWavPath(uniquePath);
      const wavBase64 = await readFileAsBase64(uniquePath);
      const chunks = splitBase64(wavBase64);

      for (const data of chunks) {
        sendEventRef.current(WS_EVENTS.AUDIO_CHUNK, { data });
      }

      sendEventRef.current(WS_EVENTS.AUDIO_END, {});
    } catch {
      sendEventRef.current(WS_EVENTS.AUDIO_END, {});
    } finally {
      isStoppingRef.current = false;
    }
  }, [onRecordingStop]);

  const resetToIdle = useCallback(() => {
    setRecordingState('idle');
  }, []);

  const setSpeaking = useCallback(() => {
    setRecordingState('speaking');
  }, []);

  return {
    permission,
    recordingState,
    nativeAvailable: isNativeAudioAvailable,
    requestPermission,
    startRecording,
    stopRecording,
    abortRecording,
    resetToIdle,
    setSpeaking,
  };
}
