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
  setSphereMode: (mode: SphereMode) => void;
  setSphereMood: (mood: SphereMood) => void;
  setMicVolume: (volume: number) => void;
  setRenderQuality: (quality: RenderQuality) => void;
}

export const createSphereSlice: StateCreator<SphereSlice> = (set) => ({
  sphereMode: "idle",
  sphereMood: "neutral",
  micVolume: 0,
  renderQuality: "high",
  setSphereMode: (mode) => set({ sphereMode: mode }),
  setSphereMood: (mood) => set({ sphereMood: mood }),
  setMicVolume: (volume) => set({ micVolume: Math.max(0, Math.min(1, volume)) }),
  setRenderQuality: (quality) => set({ renderQuality: quality }),
});
