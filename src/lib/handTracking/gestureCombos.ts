// "Together" vs "apart" wrist distance (normalized units, same space as HandFrame.wrist) —
// the gap between them is hysteresis, same spirit as PinchTracker's start/release band, so
// a clap can't refire on every frame the hands happen to rest near each other afterward.
const CLAP_TOGETHER_DIST = 0.14;
const CLAP_APART_DIST = 0.28;
// A deliberately lenient closing-speed floor (normalized units/sec) — just enough to tell
// a real clap apart from slowly, calmly bringing the hands together (e.g. clasping them in
// thought). Kept low on purpose: the bigger risk in this app so far has been gestures not
// firing at all, not firing too easily.
const CLAP_MIN_VELOCITY = 0.3;

/**
 * Detects a clap: both hands' wrists closing to near-zero distance with some real speed
 * behind it, after having been apart. Used to open the Gesture Debug panel hands-free
 * (Seção 44/45) — a deliberate, unmistakable two-hand event, unlikely to fire by accident
 * during normal orb interaction (which only ever needs the hands apart, driving a pinch).
 */
export class ClapDetector {
  private wasApart = true; // starts "apart" so the very first close-together frame can fire

  update(
    left: { x: number; y: number; velocity: number } | null,
    right: { x: number; y: number; velocity: number } | null
  ): boolean {
    if (!left || !right) {
      this.wasApart = true;
      return false;
    }
    const dist = Math.hypot(left.x - right.x, left.y - right.y);
    const fastEnough = left.velocity >= CLAP_MIN_VELOCITY || right.velocity >= CLAP_MIN_VELOCITY;
    if (this.wasApart && dist < CLAP_TOGETHER_DIST && fastEnough) {
      this.wasApart = false;
      return true;
    }
    if (dist > CLAP_APART_DIST) {
      this.wasApart = true;
    }
    return false;
  }

  reset(): void {
    this.wasApart = true;
  }
}
