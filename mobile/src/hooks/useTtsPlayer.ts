import { useCallback, useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';

const SAMPLE_RATE = 16000;

type TtsPlayerNative = {
  startStream(sampleRate: number): Promise<void>;
  writeChunk(base64Pcm: string): Promise<void>;
  endStream(): Promise<void>;
  stop(): Promise<void>;
};

const TtsPlayer = NativeModules.TtsPlayer as TtsPlayerNative | undefined;

type UseTtsPlayerOptions = {
  onPlaybackComplete: () => void;
};

export function useTtsPlayer({ onPlaybackComplete }: UseTtsPlayerOptions) {
  const streamReadyRef = useRef<Promise<void> | null>(null);
  const onCompleteRef = useRef(onPlaybackComplete);

  useEffect(() => {
    onCompleteRef.current = onPlaybackComplete;
  }, [onPlaybackComplete]);

  const onTtsStart = useCallback(async () => {
    if (!TtsPlayer) {
      return;
    }

    const ready = (async () => {
      await TtsPlayer.stop();
      await TtsPlayer.startStream(SAMPLE_RATE);
    })();
    streamReadyRef.current = ready;
    await ready;
  }, []);

  const onTtsChunk = useCallback(async (data: string) => {
    if (!TtsPlayer) {
      return;
    }

    await streamReadyRef.current;
    await TtsPlayer.writeChunk(data);
  }, []);

  const onTtsEnd = useCallback(async () => {
    if (!TtsPlayer) {
      onCompleteRef.current();
      return;
    }

    await streamReadyRef.current;
    streamReadyRef.current = null;
    try {
      await TtsPlayer.endStream();
    } finally {
      onCompleteRef.current();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (TtsPlayer) {
        void TtsPlayer.stop();
      }
    };
  }, []);

  return {
    onTtsStart,
    onTtsChunk,
    onTtsEnd,
    nativeAvailable: TtsPlayer != null,
  };
}
