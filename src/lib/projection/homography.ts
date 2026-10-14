import type { Point2D, CalibrationQuad } from "@jarvis/shared";

/**
 * 3x3 Homography Matrix represented as a flat array of 9 numbers in row-major order:
 * [h00, h01, h02,
 *  h10, h11, h12,
 *  h20, h21, h22]
 */
export type Homography3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export const IDENTITY_HOMOGRAPHY: Homography3x3 = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
];

/**
 * Computes a 3x3 projective transformation (Homography) matrix that maps 4 source points
 * to 4 destination points using the Direct Linear Transformation (DLT) algorithm.
 *
 * Solves the system:
 * [ x_i, y_i, 1,   0,   0, 0, -x_i*u_i, -y_i*u_i ] [ h00 ]   [ u_i ]
 * [   0,   0, 0, x_i, y_i, 1, -x_i*v_i, -y_i*v_i ] [ h01 ] = [ v_i ]
 *                                                   ...
 * with h22 = 1.
 */
export function computeHomography(
  src: [Point2D, Point2D, Point2D, Point2D],
  dst: [Point2D, Point2D, Point2D, Point2D]
): Homography3x3 {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];

    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);

    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }

  const h = solveLinearSystem8x8(A, b);
  if (!h) {
    return IDENTITY_HOMOGRAPHY;
  }

  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1
  ];
}

/**
 * Solves an 8x8 system of linear equations A * x = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem8x8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find max pivot in current column
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      return null; // Singular matrix
    }

    // Swap maxRow with currentRow
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row][n];
    for (let col = row + 1; col < n; col++) {
      sum -= M[row][col] * x[col];
    }
    x[row] = sum / M[row][row];
  }

  return x;
}

/**
 * Applies a 3x3 Homography to a 2D point (x, y).
 * Returns transformed point (x', y') normalized by the projective scale factor w.
 */
export function applyHomography(H: Homography3x3, point: Point2D): Point2D {
  const { x, y } = point;
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-9) {
    return { x: 0, y: 0 };
  }

  const px = (H[0] * x + H[1] * y + H[2]) / w;
  const py = (H[3] * x + H[4] * y + H[5]) / w;

  return { x: px, y: py };
}

/**
 * Inverts a 3x3 Homography matrix.
 */
export function invertHomography(H: Homography3x3): Homography3x3 {
  const [
    a, b, c,
    d, e, f,
    g, h, i
  ] = H;

  // Cofactors
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H_ = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) {
    return IDENTITY_HOMOGRAPHY;
  }

  const invDet = 1 / det;
  const h22 = I * invDet;

  // Normalize so h22 = 1 if possible
  const scale = Math.abs(h22) > 1e-9 ? 1 / h22 : 1;

  return [
    A * invDet * scale, D * invDet * scale, G * invDet * scale,
    B * invDet * scale, E * invDet * scale, H_ * invDet * scale,
    C * invDet * scale, F * invDet * scale, I * invDet * scale * scale
  ];
}

/**
 * Helper: Computes the homography matrix from camera quad to unit projection space [0,1]^2.
 * Points order: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 */
export function computeCameraToProjectionMatrix(quad: CalibrationQuad): Homography3x3 {
  const src: [Point2D, Point2D, Point2D, Point2D] = [
    quad.topLeft,
    quad.topRight,
    quad.bottomRight,
    quad.bottomLeft,
  ];

  const dst: [Point2D, Point2D, Point2D, Point2D] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  return computeHomography(src, dst);
}

/**
 * Checks whether a given 2D point lies inside a convex quadrilateral using cross products.
 */
export function isPointInsideQuad(p: Point2D, quad: CalibrationQuad): boolean {
  const corners = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  let sign = 0;

  for (let i = 0; i < 4; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % 4];
    const cross = (c2.x - c1.x) * (p.y - c1.y) - (c2.y - c1.y) * (p.x - c1.x);

    if (i === 0) {
      sign = Math.sign(cross);
    } else if (Math.sign(cross) !== sign && Math.sign(cross) !== 0) {
      return false;
    }
  }

  return true;
}

