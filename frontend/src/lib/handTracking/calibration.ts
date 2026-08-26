const STORAGE_KEY = "aurora-pointer-calibration";

export interface PointerCalibration {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// A comfortable central sub-rectangle of the raw [0,1] camera frame — most people don't
// comfortably reach the very edges of frame while sitting in front of a laptop camera, so
// this is a saner uncalibrated default than mapping the full [0,1] range 1:1.
export const DEFAULT_CALIBRATION: PointerCalibration = { minX: 0.15, maxX: 0.85, minY: 0.15, maxY: 0.85 };

export function loadCalibration(): PointerCalibration {
  if (typeof window === "undefined") return DEFAULT_CALIBRATION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CALIBRATION;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.minX === "number" &&
      typeof parsed.maxX === "number" &&
      typeof parsed.minY === "number" &&
      typeof parsed.maxY === "number" &&
      parsed.maxX > parsed.minX &&
      parsed.maxY > parsed.minY
    ) {
      return parsed;
    }
    return DEFAULT_CALIBRATION;
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

export function saveCalibration(calibration: PointerCalibration): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration));
  } catch {
    // Non-fatal — pointer mode just falls back to the default range next session.
  }
}

/** Maps a raw index-fingertip position (normalized [0,1] camera-frame coordinates) to CSS
 * pixel screen coordinates, using the calibrated comfortable-reach rectangle. Mirrors x to
 * match the selfie-view convention used everywhere else in this pipeline — pointing at the
 * physical left of the camera moves the cursor to the left of the screen. */
export function mapHandToScreen(
  x: number,
  y: number,
  calibration: PointerCalibration,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  const rangeX = calibration.maxX - calibration.minX || 1;
  const rangeY = calibration.maxY - calibration.minY || 1;
  const normX = Math.min(1, Math.max(0, (x - calibration.minX) / rangeX));
  const normY = Math.min(1, Math.max(0, (y - calibration.minY) / rangeY));
  return {
    x: (1 - normX) * viewportWidth,
    y: normY * viewportHeight,
  };
}
