declare module 'react-native-audio-record' {
  interface Options {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    audioSource?: number;
    wavFile: string;
  }

  interface AudioRecordModule {
    init(options: Options): void;
    start(): void;
    stop(): Promise<string>;
    on(event: 'data', callback: (data: string) => void): void;
  }

  const AudioRecord: AudioRecordModule;
  export default AudioRecord;
}
