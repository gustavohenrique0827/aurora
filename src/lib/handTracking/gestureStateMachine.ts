export type GestureState =
  | "IDLE" // no hand visible
  | "DETECTING" // hand visible, no recognized pose yet / below confidence
  | "READY" // pose recognized, not yet an active hold
  | "HOLDING" // pinch active and sustained
  | "MOVING" // pinch active and the hand is currently displacing
  | "RELEASING" // just transitioned out of an active hold this frame
  | "CANCELLED"; // hand lost mid-gesture

/**
 * Names the current gesture state per Seção 40 — a thin label layer over PinchTracker's
 * boolean (the only stateful gesture in Lote 1). Kept separate from PinchTracker so the
 * debug panel / future gesture history (Seção 46) has one place to read a human-readable
 * state without depending on pinch internals directly.
 */
export function deriveGestureState(params: {
  handVisible: boolean;
  confidenceOk: boolean;
  pinchActive: boolean;
  justReleased: boolean;
  movingThisFrame: boolean;
  handLostMidHold: boolean;
}): GestureState {
  if (params.handLostMidHold) return "CANCELLED";
  if (!params.handVisible) return "IDLE";
  if (!params.confidenceOk) return "DETECTING";
  if (params.justReleased) return "RELEASING";
  if (params.pinchActive) return params.movingThisFrame ? "MOVING" : "HOLDING";
  return "READY";
}
