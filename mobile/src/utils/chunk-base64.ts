const CHUNK_SIZE = 16_000;

/** Split base64 string into WS-friendly chunks. */
export function splitBase64(data: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}
