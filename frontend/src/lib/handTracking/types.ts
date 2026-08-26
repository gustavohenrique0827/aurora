export type HandSide = "left" | "right";

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";
export type FingerExtension = "EXTENDED" | "FOLDED" | "PARTIALLY_EXTENDED";

export type FingerStates = Record<FingerName, FingerExtension>;

export type PoseName =
  | "OPEN_PALM"
  | "CLOSED_FIST"
  | "POINTING"
  | "PINCH"
  | "OK"
  | "PEACE"
  | "THREE_FINGERS"
  | "FOUR_FINGERS"
  | "ROCK"
  | "CALL"
  | "FINGER_GUN"
  | "THUMBS_UP"
  | "THUMBS_DOWN"
  | "CUSTOM"
  | "UNKNOWN";

export interface PoseResult {
  pose: PoseName;
  confidence: number; // 0..1
  /** Set only when pose === "CUSTOM" — which user-recorded gesture (Seção 41) matched. */
  customGestureId?: string;
}

export interface PinchState {
  active: boolean;
  /** 0 (fingers touching) upward — normalized by hand scale so it's roughly distance-invariant. */
  distanceRatio: number;
  /** Midpoint between thumb tip and index tip, normalized [0,1] image coordinates. */
  position: { x: number; y: number };
}

export interface CircularMotionState {
  active: boolean;
  direction: "cw" | "ccw" | null;
  /** radians/sec of the loop currently being traced. */
  angularVelocity: number;
}

export type SwipeDirection = "up" | "down" | "left" | "right";

export interface SwipeState {
  /** True for exactly the one frame a swipe is recognized — an edge-triggered pulse, not
   * a held state (a swipe is a flick, not a pose you sustain). */
  active: boolean;
  direction: SwipeDirection | null;
  speed: number; // normalized units/sec
}

/**
 * The air-gesture vocabulary (Seções 20-30): click/double-click/hold/drag/drop/scroll/
 * back/forward/confirm/cancel, derived from pinch timing, swipe direction, and edge-
 * triggered pose changes. Each is an edge-triggered pulse (present on HandFrame for one
 * frame only) — consumers that need continuous behavior (e.g. Lote 5's pointer mode)
 * react to the pulse rather than polling a held boolean.
 */
export type AirGestureEvent =
  | { type: "CLICK" }
  | { type: "DOUBLE_CLICK" }
  | { type: "HOLD_START" }
  | { type: "HOLD_END" }
  | { type: "DRAG_START" }
  | { type: "DRAG_MOVE"; dx: number; dy: number }
  | { type: "DROP" }
  | { type: "SCROLL"; delta: number }
  | { type: "BACK" }
  | { type: "FORWARD" }
  | { type: "CONFIRM" }
  | { type: "CANCEL" };

export interface HandFrame {
  side: HandSide;
  landmarks: Point3[]; // 21 points, normalized [0,1] image space (z is relative depth)
  wrist: { x: number; y: number };
  handednessConfidence: number; // MediaPipe's own left/right classification confidence
  fingerStates: FingerStates;
  pose: PoseResult;
  pinch: PinchState;
  /** Unit vector (mirrored to match on-screen rendering) from the index MCP to the index
   * tip — only populated while pose is POINTING or FINGER_GUN, null otherwise. Feeds
   * spatial "isso/aquilo" targeting (Lote 7); unused by anything yet in Lote 2. */
  pointingDirection: { x: number; y: number } | null;
  /** Seção 17 — an OPEN_PALM hand tracing a loop, tracked independently of pinch/drag. */
  circularMotion: CircularMotionState;
  /** Edge-triggered air-gesture pulse for THIS frame only — null on every other frame.
   * Compare against HandFrame.timestamp (not object identity) to dedupe across re-reads
   * of the same stored frame, since consumers may run at a different loop rate. */
  gestureEvent: AirGestureEvent | null;
  velocity: number; // normalized units/sec, wrist-based
  timestamp: number;
}
