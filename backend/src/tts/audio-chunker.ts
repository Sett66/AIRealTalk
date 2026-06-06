const DEFAULT_PCM_CHUNK_SIZE = 6400;

/** Split PCM (16-bit LE mono) into streaming chunks for mobile AudioTrack playback. */
export function chunkPcmForStreaming(
  pcm: Buffer,
  pcmChunkSize = DEFAULT_PCM_CHUNK_SIZE,
): Buffer[] {
  const chunks: Buffer[] = [];

  for (let offset = 0; offset < pcm.length; offset += pcmChunkSize) {
    const slice = pcm.subarray(offset, offset + pcmChunkSize);
    if (slice.length > 0) {
      chunks.push(slice);
    }
  }

  return chunks;
}

export function extractPcmFromAudio(audioBuffer: Buffer): Buffer {
  if (
    audioBuffer.length >= 44 &&
    audioBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    audioBuffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return audioBuffer.subarray(44);
  }
  return audioBuffer;
}
