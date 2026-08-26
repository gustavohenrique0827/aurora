import type { SwipeState } from "./types";

// Window to evaluate a flick within, and the gates that separate a real swipe from a
// twitch (too short/slow) or a loop (CircularMotionTracker's territory, not this one).
const HISTORY_MS = 350;
const MIN_DISTANCE = 0.12; // normalized image-space displacement
const MIN_SPEED = 0.6; // normalized units/sec
const MIN_STRAIGHTNESS = 0.6; // direct displacement / path length — low means it looped
const COOLDOWN_MS = 250;

interface Sample {
  x: number;
  y: number;
  t: number;
}

/**
 * Per-hand tracker (one instance per hand side, held in a ref by the caller — same
 * pattern as PinchTracker/CircularMotionTracker) that recognizes a fast, roughly-straight
 * hand flick and reports its direction. Feeds BACK/FORWARD/SCROLL in airGestures.ts.
 */
export class SwipeTracker {
  private history: Sample[] = [];
  private cooldownUntil = 0;

  update(x: number, y: number, t: number): SwipeState {
    this.history.push({ x, y, t });
    const cutoff = t - HISTORY_MS;
    this.history = this.history.filter((s) => s.t >= cutoff);

    if (t < this.cooldownUntil || this.history.length < 4) {
      return { active: false, direction: null, speed: 0 };
    }

    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist = Math.hypot(dx, dy);
    const dtSeconds = (last.t - first.t) / 1000 || 1;
    const speed = dist / dtSeconds;

    if (dist < MIN_DISTANCE || speed < MIN_SPEED) {
      return { active: false, direction: null, speed: 0 };
    }

    let pathLength = 0;
    for (let i = 1; i < this.history.length; i++) {
      pathLength += Math.hypot(this.history[i].x - this.history[i - 1].x, this.history[i].y - this.history[i - 1].y);
    }
    if (pathLength > 0 && dist / pathLength < MIN_STRAIGHTNESS) {
      // Path wanders more than it travels in a straight line — a loop or wobble, not a flick.
      return { active: false, direction: null, speed: 0 };
    }

    // Mirrored feed (selfie view, matching the rest of this pipeline): raw x increasing
    // reads as moving toward the viewer's LEFT on screen, so flip it for the label.
    const screenDx = -dx;
    const direction =
      Math.abs(screenDx) > Math.abs(dy) ? (screenDx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";

    this.history = []; // consumed — the next swipe needs a fresh window
    this.cooldownUntil = t + COOLDOWN_MS;
    return { active: true, direction, speed };
  }

  reset(): void {
    this.history = [];
    this.cooldownUntil = 0;
  }
}
