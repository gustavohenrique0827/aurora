import type { CircularMotionState } from "./types";

// Window to evaluate a loop within, and the minimum radius/turns before calling motion
// "circular" rather than jittery hand-hold noise or a straight swipe.
const HISTORY_MS = 900;
const MIN_RADIUS = 0.05;
const MIN_TURNS = 0.75;
const MIN_SAMPLES = 6;

interface Sample {
  x: number;
  y: number;
  t: number;
}

/**
 * Per-hand tracker (one instance per hand side, held in a ref by the caller — same
 * pattern as PinchTracker) that watches a short history of the hand's position and
 * reports whether it's currently tracing a loop — Seção 17's "rotação circular" gesture.
 * Deliberately independent of PINCH: this is for an OPEN_PALM hand circling in the air,
 * not a pinch-and-drag (SphereScene only acts on it when pinch is NOT active).
 */
export class CircularMotionTracker {
  private history: Sample[] = [];

  update(x: number, y: number, t: number): CircularMotionState {
    this.history.push({ x, y, t });
    const cutoff = t - HISTORY_MS;
    this.history = this.history.filter((s) => s.t >= cutoff);
    if (this.history.length < MIN_SAMPLES) return { active: false, direction: null, angularVelocity: 0 };

    const cx = this.history.reduce((sum, s) => sum + s.x, 0) / this.history.length;
    const cy = this.history.reduce((sum, s) => sum + s.y, 0) / this.history.length;
    const avgRadius =
      this.history.reduce((sum, s) => sum + Math.hypot(s.x - cx, s.y - cy), 0) / this.history.length;
    if (avgRadius < MIN_RADIUS) return { active: false, direction: null, angularVelocity: 0 };

    let totalAngle = 0;
    for (let i = 1; i < this.history.length; i++) {
      const a0 = Math.atan2(this.history[i - 1].y - cy, this.history[i - 1].x - cx);
      const a1 = Math.atan2(this.history[i].y - cy, this.history[i].x - cx);
      let delta = a1 - a0;
      // Wrap into (-PI, PI] so crossing atan2's seam doesn't register as a huge jump.
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      totalAngle += delta;
    }

    const turns = Math.abs(totalAngle) / (Math.PI * 2);
    if (turns < MIN_TURNS) return { active: false, direction: null, angularVelocity: 0 };

    const dtSeconds = (this.history[this.history.length - 1].t - this.history[0].t) / 1000 || 1;
    return {
      active: true,
      // Sign is internally consistent (drives a real spin direction in SphereScene) but
      // not independently verified against a strict on-screen "clockwise" definition —
      // confirm the feel during live testing and flip the sign there if it spins backwards.
      direction: totalAngle > 0 ? "cw" : "ccw",
      angularVelocity: Math.abs(totalAngle) / dtSeconds,
    };
  }

  reset(): void {
    this.history = [];
  }
}
