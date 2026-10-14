import type { FingerStates, PoseResult, Point3 } from "./types";

const THUMB_TIP = 4;
const WRIST = 0;
const INDEX_MCP = 5;
const INDEX_TIP = 8;

function count(states: FingerStates, value: "EXTENDED" | "FOLDED"): number {
  return Object.values(states).filter((s) => s === value).length;
}

/** Unit vector (mirrored to match the on-screen selfie view) from the index MCP to the
 * index tip — the "where is this finger aiming" primitive behind POINTING/FINGER_GUN. */
export function computePointingDirection(landmarks: Point3[]): { x: number; y: number } | null {
  const mcp = landmarks[INDEX_MCP];
  const tip = landmarks[INDEX_TIP];
  const dx = tip.x - mcp.x;
  const dy = tip.y - mcp.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return null;
  return { x: -dx / len, y: dy / len };
}

/**
 * Rule-based pose classification over the 5 finger states (plus thumb vertical direction
 * for thumbs up/down). Deliberately not ML-based — a lookup of finger-state combinations
 * is transparent, fast, and exactly what Lote 2's "custom gestures" extends: a custom
 * pose is just one more rule added to this same table.
 *
 * `confidence` here is a rule-match strength (how cleanly the fingers fall into the
 * expected states), not a model probability — good enough to gate against
 * `confidenceThreshold` per the spec's "don't act on low confidence" requirement.
 */
export function classifyPose(landmarks: Point3[], states: FingerStates): PoseResult {
  const extendedCount = count(states, "EXTENDED");
  const foldedCount = count(states, "FOLDED");

  if (extendedCount === 5) return { pose: "OPEN_PALM", confidence: 0.9 };
  if (foldedCount === 5) return { pose: "CLOSED_FIST", confidence: 0.9 };

  const othersFolded = states.middle === "FOLDED" && states.ring === "FOLDED" && states.pinky === "FOLDED";

  // Order matters below: each rule is checked before POINTING/generic fallbacks so a
  // more specific combination (e.g. FINGER_GUN, which also has index extended + others
  // folded) wins over a looser one.

  if (
    states.index === "EXTENDED" &&
    states.middle === "EXTENDED" &&
    states.ring === "EXTENDED" &&
    states.pinky === "EXTENDED" &&
    states.thumb === "FOLDED"
  ) {
    return { pose: "FOUR_FINGERS", confidence: 0.8 };
  }

  if (
    states.index === "EXTENDED" &&
    states.middle === "EXTENDED" &&
    states.ring === "EXTENDED" &&
    states.pinky === "FOLDED"
  ) {
    return { pose: "THREE_FINGERS", confidence: 0.8 };
  }

  if (
    states.index === "EXTENDED" &&
    states.middle === "EXTENDED" &&
    states.ring === "FOLDED" &&
    states.pinky === "FOLDED"
  ) {
    return { pose: "PEACE", confidence: 0.85 };
  }

  if (
    states.thumb === "EXTENDED" &&
    states.pinky === "EXTENDED" &&
    states.index === "FOLDED" &&
    states.middle === "FOLDED" &&
    states.ring === "FOLDED"
  ) {
    return { pose: "CALL", confidence: 0.85 };
  }

  if (
    states.index === "EXTENDED" &&
    states.pinky === "EXTENDED" &&
    states.middle === "FOLDED" &&
    states.ring === "FOLDED"
  ) {
    return { pose: "ROCK", confidence: 0.8 };
  }

  if (states.thumb === "EXTENDED" && states.index === "EXTENDED" && othersFolded) {
    return { pose: "FINGER_GUN", confidence: 0.85 };
  }

  if (states.index === "EXTENDED" && states.thumb !== "EXTENDED" && othersFolded) {
    return { pose: "POINTING", confidence: 0.85 };
  }

  if (states.thumb === "EXTENDED" && states.index === "FOLDED" && othersFolded) {
    const thumbTip = landmarks[THUMB_TIP];
    const wrist = landmarks[WRIST];
    // Image y grows downward, so a smaller y than the wrist means the thumb points up.
    if (thumbTip.y < wrist.y - 0.06) return { pose: "THUMBS_UP", confidence: 0.85 };
    if (thumbTip.y > wrist.y + 0.06) return { pose: "THUMBS_DOWN", confidence: 0.85 };
  }

  return { pose: "UNKNOWN", confidence: 0.3 };
}
