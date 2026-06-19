import { create } from 'zustand';
import RNFS from 'react-native-fs';

export interface CachedTurnAudio {
  utteranceId: string;
  text: string;
  wavPath: string;
}

interface TurnAudioStore {
  turns: CachedTurnAudio[];
  pendingWavPath: string | null;
  setPendingWavPath: (wavPath: string | null) => void;
  attachTextToTurn: (utteranceId: string, text: string) => void;
  clearTurns: () => Promise<void>;
}

export const useTurnAudioStore = create<TurnAudioStore>((set, get) => ({
  turns: [],
  pendingWavPath: null,
  setPendingWavPath: (wavPath) => set({ pendingWavPath: wavPath }),
  attachTextToTurn: (utteranceId, text) => {
    const { pendingWavPath, turns } = get();
    if (!pendingWavPath) {
      return;
    }

    set({
      turns: [...turns, { utteranceId, text, wavPath: pendingWavPath }],
      pendingWavPath: null,
    });
  },
  clearTurns: async () => {
    const { turns } = get();
    await Promise.all(
      turns.map(async (turn) => {
        try {
          const exists = await RNFS.exists(turn.wavPath);
          if (exists) {
            await RNFS.unlink(turn.wavPath);
          }
        } catch {
          // ignore cleanup errors
        }
      }),
    );
    set({ turns: [], pendingWavPath: null });
  },
}));

export function getCachedTurns(): CachedTurnAudio[] {
  return useTurnAudioStore.getState().turns;
}
