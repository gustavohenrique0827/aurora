import type { SphereMode, SphereMood } from "../../state/slices/sphereSlice";

export const MOOD_COLOR: Record<SphereMood, [number, number, number]> = {
  neutral: [0.31, 0.84, 1.0],
  positive: [0.36, 1.0, 0.69],
  alert: [1.0, 0.36, 0.48],
};

export const MODE_PULSE_SPEED: Record<SphereMode, number> = {
  idle: 0.6,
  listening: 1.4,
  thinking: 2.2,
  analyzing: 2.6,
  speaking: 1.8,
  executing: 2.4,
  warning: 1.5,
  success: 1.0,
  error: 0.9,
};

export const MODE_COLOR_OVERRIDE: Partial<Record<SphereMode, [number, number, number]>> = {
  analyzing: [0.72, 0.35, 1.0], // Violet / Holographic Magenta
  executing: [0.2, 0.95, 0.65],  // Emerald Tech Neon
  warning: [1.0, 0.72, 0.18],    // Amber warning
  success: [0.15, 1.0, 0.85],    // Bright Cyan-Green Success
  error: [1.0, 0.28, 0.38],      // Vivid Crimson
};
