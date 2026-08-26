import type { Point3 } from "./types";

const WRIST = 0;
const MIDDLE_MCP = 9;
const STORAGE_KEY = "aurora-custom-gestures";
// Average per-point distance (in the same normalized units as the snapshot) below which
// a live hand counts as matching a recorded gesture. Loose enough to tolerate natural
// hand-pose wobble, tight enough that two genuinely different poses don't collide.
const MATCH_THRESHOLD = 0.35;

export interface CustomGestureDef {
  id: string;
  name: string;
  /** Free-text label for what this gesture should do — Lote 5 only records and matches
   * the shape; wiring a label to an actual action is left to whatever feature consumes it. */
  action: string;
  /** 21 landmarks, normalized relative to the wrist and scaled by wrist→middle-MCP
   * distance — the same scale/position-invariance trick as pinchDistanceRatio, so the
   * same physical gesture matches regardless of hand size or distance from the camera. */
  snapshot: Point3[];
  createdAt: number;
}

function normalizeForSnapshot(landmarks: Point3[]): Point3[] {
  const wrist = landmarks[WRIST];
  const scale = Math.hypot(
    landmarks[MIDDLE_MCP].x - wrist.x,
    landmarks[MIDDLE_MCP].y - wrist.y,
    landmarks[MIDDLE_MCP].z - wrist.z
  ) || 1;
  return landmarks.map((p) => ({
    x: (p.x - wrist.x) / scale,
    y: (p.y - wrist.y) / scale,
    z: (p.z - wrist.z) / scale,
  }));
}

export function captureGestureSnapshot(landmarks: Point3[]): Point3[] {
  return normalizeForSnapshot(landmarks);
}

/** Returns the best-matching custom gesture for the live hand, or null if none is close
 * enough — checked by useHandTrackingEngine only when the built-in pose table (Lote 1/2)
 * comes back UNKNOWN, so custom gestures fill gaps rather than shadow the built-ins. */
export function matchCustomGesture(landmarks: Point3[], defs: CustomGestureDef[]): CustomGestureDef | null {
  if (defs.length === 0) return null;
  const live = normalizeForSnapshot(landmarks);

  let best: { def: CustomGestureDef; dist: number } | null = null;
  for (const def of defs) {
    if (def.snapshot.length !== live.length) continue;
    let sum = 0;
    for (let i = 0; i < live.length; i++) {
      sum += Math.hypot(
        live[i].x - def.snapshot[i].x,
        live[i].y - def.snapshot[i].y,
        live[i].z - def.snapshot[i].z
      );
    }
    const avgDist = sum / live.length;
    if (avgDist < MATCH_THRESHOLD && (!best || avgDist < best.dist)) {
      best = { def, dist: avgDist };
    }
  }
  return best?.def ?? null;
}

export function loadCustomGestures(): CustomGestureDef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomGestures(defs: CustomGestureDef[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defs));
  } catch {
    // Storage full or blocked (private browsing) — losing custom gestures on save is a
    // minor annoyance, not worth surfacing an error UI for.
  }
}
