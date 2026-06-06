export type TtsChunkHandler = (chunk: Buffer) => void;

export abstract class TtsService {
  abstract synthesize(text: string, onChunk: TtsChunkHandler): Promise<void>;
}
