import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules } from 'react-native';
import { WS_EVENTS } from '@airealtalk/shared';
import AudioRecord from 'react-native-audio-record';
import { splitBase64 } from '../utils/chunk-base64';
import { readFileAsBase64 } from '../utils/read-file-base64';
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
  const initializedRef = useRef(false);

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

  const requestPermission = useCallback(async () => {
    const result = await requestMicPermission();
    setPermission(result);
    return result;
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isNativeAudioAvailable || !wsConnected) {
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
    AudioRecord.start();
    return true;
  }, [onRecordingStart, permission, requestPermission, sendEvent, wsConnected]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = false;
    setRecordingState('processing');
    onRecordingStop?.();

    try {
      const wavPath = await AudioRecord.stop();
      const wavBase64 = await readFileAsBase64(wavPath);
      const chunks = splitBase64(wavBase64);

      for (const data of chunks) {
        sendEvent(WS_EVENTS.AUDIO_CHUNK, { data });
      }

      sendEvent(WS_EVENTS.AUDIO_END, {});
    } catch {
      sendEvent(WS_EVENTS.AUDIO_END, {});
    }
  }, [onRecordingStop, sendEvent]);

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
    resetToIdle,
    setSpeaking,
  };
}
