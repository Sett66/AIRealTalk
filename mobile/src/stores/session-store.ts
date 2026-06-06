import { create } from 'zustand';
import type { SessionPhase } from '@airealtalk/shared';

interface SessionStore {
  phase: SessionPhase;
  setPhase: (phase: SessionPhase) => void;
  resetPhase: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  phase: 'idle',
  setPhase: (phase) => set({ phase }),
  resetPhase: () => set({ phase: 'idle' }),
}));
