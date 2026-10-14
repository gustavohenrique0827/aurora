import type { Point3 } from "./types";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const WRIST = 0;
const MIDDLE_MCP = 9;

// Hysteresis band: start below START, release above RELEASE — the gap between them is
// what stops the pinch flickering start/release when fingers hover right at the edge.
// These are the BASE values at the middle (0.5) of the user-facing "Sensibilidade do
// Pinch" slider — see pinchThresholds() below for how sensitivity adjusts them live,
// which exists precisely because the right threshold depends on the user's camera/hand
// and can't be nailed from a single guess (see project history: this exact pair went
// from 0.4/0.55 to this base after real-world testing showed pinch wasn't triggering).
const PINCH_START_BASE = 0.48;
const PINCH_HYSTERESIS_GAP = 0.15;
const PINCH_SENSITIVITY_SPAN = 0.24; // total start-ratio swing across sensitivity 0..1
// Consecutive frames required before flipping state — Seção 39 "gesture debounce":
// stops one noisy frame from firing an accidental grab/release.
const DEBOUNCE_FRAMES = 2;

/** Maps the 0..1 "Sensibilidade do Pinch" slider (Configurações) to actual start/release
 * ratio thresholds. Higher sensitivity = pinch triggers on a looser (larger) thumb-index
 * gap — turn it up when pinch never reads ATIVO for a given hand/camera; turn it down if
 * it fires accidentally on an open hand. */
export function pinchThresholds(sensitivity: number): { start: number; release: number } {
  const clamped = Math.max(0, Math.min(1, sensitivity));
  const start = PINCH_START_BASE + (clamped - 0.5) * PINCH_SENSITIVITY_SPAN;
  return { start, release: start + PINCH_HYSTERESIS_GAP };
}

// See the identical note in fingerState.ts's dist() — x/y are normalized by width/height
// independently, so raw Math.hypot on them distorts distance by hand orientation on a
// non-square frame. `aspect` (video width / height) corrects it.
function dist(a: Point3, b: Point3, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y, (a.z - b.z) * aspect);
}

/** Thumb-to-index tip distance, normalized by a wrist→middle-MCP reference length so the
 * same physical pinch reads the same whether the hand is close to or far from the camera.
 * @param aspect video.videoWidth / video.videoHeight for the current frame. */
export function pinchDistanceRatio(landmarks: Point3[], aspect: number): number {
  const scale = dist(landmarks[WRIST], landmarks[MIDDLE_MCP], aspect) || 1;
  return dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP], aspect) / scale;
}

export function pinchMidpoint(landmarks: Point3[]): { x: number; y: number } {
  const a = landmarks[THUMB_TIP];
  const b = landmarks[INDEX_TIP];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Per-hand debounced pinch tracker — one instance per hand side, held in a ref by the
 * caller (see useHandTrackingEngine) so state survives across frames. */
export class PinchTracker {
  private active = false;
  private pendingFrames = 0;

  /** @param startRatio / @param releaseRatio — from pinchThresholds(sensitivity), computed
   * fresh by the caller every tick so a live change to the sensitivity slider takes effect
   * immediately without needing to reset the tracker. */
  update(ratio: number, startRatio: number, releaseRatio: number): boolean {
    if (this.active) {
      if (ratio > releaseRatio) {
        this.pendingFrames++;
        if (this.pendingFrames >= DEBOUNCE_FRAMES) {
          this.active = false;
          this.pendingFrames = 0;
        }
      } else {
        this.pendingFrames = 0;
      }
    } else {
      if (ratio < startRatio) {
        this.pendingFrames++;
        if (this.pendingFrames >= DEBOUNCE_FRAMES) {
          this.active = true;
          this.pendingFrames = 0;
        }
      } else {
        this.pendingFrames = 0;
      }
    }
    return this.active;
  }

  reset(): void {
    this.active = false;
    this.pendingFrames = 0;
  }
}
