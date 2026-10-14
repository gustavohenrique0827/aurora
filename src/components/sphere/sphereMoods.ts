import type { SphereMode, SphereMood } from "../../state/slices/sphereSlice";

export const MOOD_COLOR: Record<SphereMood, [number, number, number]> = {
  neutral: [1.0, 0.48, 0.1],
  positive: [0.29, 0.87, 0.5],
  alert: [1.0, 0.36, 0.36],
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
  analyzing: [1.0, 0.78, 0.5],   // Warm white-amber
  executing: [0.29, 0.87, 0.5],  // Green
  warning: [0.96, 0.76, 0.26],   // Amber warning
  success: [0.29, 0.87, 0.5],    // Green success
  error: [1.0, 0.3, 0.3],        // Red
};
