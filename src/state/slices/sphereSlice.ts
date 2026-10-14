import type { StateCreator } from "zustand";

export type SphereMode =
  | "idle"
  | "listening"
  | "thinking"
  | "analyzing"
  | "speaking"
  | "executing"
  | "warning"
  | "success"
  | "error";
export type SphereMood = "neutral" | "positive" | "alert";
export type RenderQuality = "high" | "low";

export interface SphereSlice {
  sphereMode: SphereMode;
  sphereMood: SphereMood;
  micVolume: number; // 0..1
  /** Mirrors EnergySphere.tsx's FpsWatcher latch into the store (Seção 59) so the current
   * render-quality tier is inspectable from GestureDebugPanel/Configurações without prop
   * drilling. EnergySphere remains the source of truth (its own lowPower state drives the
   * actual geometry/effects downgrade) — this is a read side channel, not a second switch. */
  renderQuality: RenderQuality;
  /** Loudness (0..1) of Aurora's own voice playback, from an analyser on the TTS <audio>
   * element — drives the face's mouth. 0 when she isn't speaking. */
  speechLevel: number;
  /** Agent neuron currently "opened" inside Aurora's head (agentRoster key), or null. */
  openedAgentKey: string | null;
  /** Bumped to replay the synapse-assembly opening animation of the face. */
  faceIntroNonce: number;
  /** Aurora's brain brought out of her head (tap on the AURORA core toggles it). */
  brainOpen: boolean;
  setSphereMode: (mode: SphereMode) => void;
  setSphereMood: (mood: SphereMood) => void;
  setMicVolume: (volume: number) => void;
  setRenderQuality: (quality: RenderQuality) => void;
  setSpeechLevel: (level: number) => void;
  setOpenedAgentKey: (key: string | null) => void;
  replayFaceIntro: () => void;
  setBrainOpen: (open: boolean) => void;
}

export const createSphereSlice: StateCreator<SphereSlice> = (set) => ({
  sphereMode: "idle",
  sphereMood: "neutral",
  micVolume: 0,
  renderQuality: "high",
  speechLevel: 0,
  openedAgentKey: null,
  faceIntroNonce: 0,
  brainOpen: false,
  setSphereMode: (mode) => set({ sphereMode: mode }),
  setSphereMood: (mood) => set({ sphereMood: mood }),
  setMicVolume: (volume) => set({ micVolume: Math.max(0, Math.min(1, volume)) }),
  setRenderQuality: (quality) => set({ renderQuality: quality }),
  setSpeechLevel: (level) => set({ speechLevel: Math.max(0, Math.min(1, level)) }),
  // Opening an agent always opens the brain too: agents live in it, so it must be visible.
  setOpenedAgentKey: (key) => set(key ? { openedAgentKey: key, brainOpen: true } : { openedAgentKey: null }),
  replayFaceIntro: () => set((s) => ({ faceIntroNonce: s.faceIntroNonce + 1 })),
  setBrainOpen: (open) => set(open ? { brainOpen: true } : { brainOpen: false, openedAgentKey: null }),
});
