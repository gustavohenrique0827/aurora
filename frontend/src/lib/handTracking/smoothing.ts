import type { Point2D } from "@jarvis/shared";

/**
 * Low-pass filter with exponential smoothing.
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filter(val: number, alpha: number): number {
    if (this.y === null) {
      this.s = val;
      this.y = val;
      return val;
    }
    this.s = alpha * val + (1 - alpha) * this.s!;
    this.y = this.s;
    return this.y;
  }

  public lastValue(): number | null {
    return this.y;
  }

  public reset() {
    this.y = null;
    this.s = null;
  }
}

/**
 * One-Euro Filter: Precise, adaptive jitter-removal filter for interactive hand tracking.
 *
 * Automatically decreases cutoff frequency at low speed to completely stabilize the cursor
 * (eliminating hand tremor when aiming at small buttons), and dynamically increases cutoff
 * frequency during rapid hand motions to achieve zero perceptible lag.
 *
 * Reference: Casiez et al., CHI 2012 ("1 € Filter: A Simple Speed-based Low-pass Filter for Noisy Input in HCI")
 */
export class OneEuroFilter2D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private yFilter = new LowPassFilter();
  private dyFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(minCutoff = 1.2, beta = 0.05, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  public filter(point: Point2D, timestamp: number): Point2D {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      this.xFilter.filter(point.x, 1);
      this.yFilter.filter(point.y, 1);
      return point;
    }

    const dt = Math.max(0.001, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    // Filter derivatives
    const lastX = this.xFilter.lastValue() ?? point.x;
    const lastY = this.yFilter.lastValue() ?? point.y;
    const dx = (point.x - lastX) * rate;
    const dy = (point.y - lastY) * rate;

    const alphaD = this.alpha(rate, this.dCutoff);
    const edx = this.dxFilter.filter(dx, alphaD);
    const edy = this.dyFilter.filter(dy, alphaD);

    const speed = Math.hypot(edx, edy);

    // Adaptive cutoff
    const cutoff = this.minCutoff + this.beta * speed;
    const alphaPos = this.alpha(rate, cutoff);

    const smoothX = this.xFilter.filter(point.x, alphaPos);
    const smoothY = this.yFilter.filter(point.y, alphaPos);

    return { x: smoothX, y: smoothY };
  }

  public reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.yFilter.reset();
    this.dyFilter.reset();
    this.lastTime = null;
  }
}

