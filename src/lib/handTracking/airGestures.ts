import type { AirGestureEvent, PoseName, SwipeState } from "./types";

const HOLD_MS = 500;
const DRAG_DEADZONE = 0.03; // normalized image-space distance
const CLICK_MAX_MS = 400; // pinch shorter than this + under the deadzone = a tap, not a drag
const DOUBLE_CLICK_WINDOW_MS = 400;

type PinchPhase = "idle" | "pinchDown" | "holding" | "dragging";

/**
 * Per-hand tracker (one instance per hand side, held in a ref by the caller) turning raw
 * pinch timing + swipes + edge-triggered poses into the air-gesture vocabulary (Seções
 * 20-30): click, double-click, hold, drag, drop, scroll, back, forward, confirm, cancel.
 * Emits at most one event per frame — this is a source of discrete pulses for a future
 * consumer (Lote 5's pointer mode) to act on, not an action-executor itself.
 */
export class AirGestureTracker {
  private phase: PinchPhase = "idle";
  private pinchStartT = 0;
  private pinchStartPos = { x: 0, y: 0 };
  private lastPos = { x: 0, y: 0 };
  private lastClickT = -Infinity;
  private lastEdgePose: PoseName | null = null;

  update(params: {
    pinchActive: boolean;
    pinchPos: { x: number; y: number };
    pose: PoseName;
    swipe: SwipeState;
    t: number;
  }): AirGestureEvent | null {
    const { pinchActive, pinchPos, pose, swipe, t } = params;
    let event: AirGestureEvent | null = null;

    if (pinchActive && this.phase === "idle") {
      this.phase = "pinchDown";
      this.pinchStartT = t;
      this.pinchStartPos = { ...pinchPos };
      this.lastPos = { ...pinchPos };
    } else if (pinchActive && this.phase === "pinchDown") {
      const dist = Math.hypot(pinchPos.x - this.pinchStartPos.x, pinchPos.y - this.pinchStartPos.y);
      if (dist > DRAG_DEADZONE) {
        this.phase = "dragging";
        event = { type: "DRAG_START" };
      } else if (t - this.pinchStartT > HOLD_MS) {
        this.phase = "holding";
        event = { type: "HOLD_START" };
      }
      this.lastPos = { ...pinchPos };
    } else if (pinchActive && this.phase === "dragging") {
      event = { type: "DRAG_MOVE", dx: pinchPos.x - this.lastPos.x, dy: pinchPos.y - this.lastPos.y };
      this.lastPos = { ...pinchPos };
    } else if (pinchActive && this.phase === "holding") {
      this.lastPos = { ...pinchPos }; // held steady — no repeated events until release
    } else if (!pinchActive && this.phase !== "idle") {
      const heldMs = t - this.pinchStartT;
      if (this.phase === "dragging") {
        event = { type: "DROP" };
      } else if (this.phase === "holding") {
        event = { type: "HOLD_END" };
      } else if (heldMs <= CLICK_MAX_MS) {
        if (t - this.lastClickT <= DOUBLE_CLICK_WINDOW_MS) {
          event = { type: "DOUBLE_CLICK" };
          this.lastClickT = -Infinity; // consumed — don't let a third tap chain another double
        } else {
          event = { type: "CLICK" };
          this.lastClickT = t;
        }
      }
      this.phase = "idle";
    }

    // Swipe → BACK/FORWARD/SCROLL — an open-hand flick, independent of the pinch phase
    // above, so it can't fire mid-drag (a real drag already deadzone-committed to DRAG_MOVE).
    if (!event && swipe.active && swipe.direction) {
      if (swipe.direction === "left") event = { type: "BACK" };
      else if (swipe.direction === "right") event = { type: "FORWARD" };
      else event = { type: "SCROLL", delta: swipe.direction === "up" ? swipe.speed : -swipe.speed };
    }

    // CONFIRM/CANCEL — edge-triggered on THUMBS_UP/THUMBS_DOWN becoming newly recognized,
    // so holding the pose doesn't refire it every frame.
    if (!event) {
      if (pose === "THUMBS_UP" && this.lastEdgePose !== "THUMBS_UP") event = { type: "CONFIRM" };
      else if (pose === "THUMBS_DOWN" && this.lastEdgePose !== "THUMBS_DOWN") event = { type: "CANCEL" };
    }
    this.lastEdgePose = pose === "THUMBS_UP" || pose === "THUMBS_DOWN" ? pose : null;

    return event;
  }

  reset(): void {
    this.phase = "idle";
    this.lastClickT = -Infinity;
    this.lastEdgePose = null;
  }
}
