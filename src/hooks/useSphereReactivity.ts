import { useJarvisStore } from "../state/store";
import type { SphereMode, SphereMood } from "../state/slices/sphereSlice";
import { MOOD_COLOR, MODE_PULSE_SPEED, MODE_COLOR_OVERRIDE } from "../components/sphere/sphereMoods";

export interface SphereRenderParams {
  mode: SphereMode;
  mood: SphereMood;
  micVolume: number;
  baseColor: [number, number, number];
  pulseSpeed: number;
}

/** The only hook SphereScene subscribes to — keeps Three.js code fully decoupled from voice/chat logic. */
export function useSphereReactivity(): SphereRenderParams {
  const mode = useJarvisStore((s) => s.sphereMode);
  const mood = useJarvisStore((s) => s.sphereMood);
  const micVolume = useJarvisStore((s) => s.micVolume);

  const baseColor = MODE_COLOR_OVERRIDE[mode] ?? MOOD_COLOR[mood];
  const pulseSpeed = MODE_PULSE_SPEED[mode] ?? 0.6;

  return {
    mode,
    mood,
    micVolume,
    baseColor,
    pulseSpeed,
  };
}
