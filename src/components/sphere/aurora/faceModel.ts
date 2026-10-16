/**
 * Aurora's head as synapse nodes, built on a REAL human face: the MediaPipe canonical face
 * model (468 landmarks measured from real faces) supplies the face mesh, eyes, brows and lips.
 * Around it: skull, ears and neck outline, a neural web filling the cranium ("the brain") and
 * a halo of synapses. Face looks down +Z toward the camera. Pure data — SynapseFace animates it.
 */
import { CANONICAL_FACE_VERTICES, FACE_FEATURE_EDGES, FACE_TESSELATION } from "./canonicalFace";

export type FaceRegion =
  | "outline"
  | "fill"
  | "grid"
  | "halo"
  | "eye"
  | "iris"
  | "pupil"
  | "brow"
  | "nose"
  | "lipUpper"
  | "lipLower"
  | "hair";

export type LinkKind = "feature" | "grid" | "web" | "hair";

export interface FacePoint {
  x: number;
  y: number;
  z: number;
  region: FaceRegion;
  /** -1 = viewer's left, 1 = right, 0 = centered. */
  side: -1 | 0 | 1;
  /** Lips: -1..1 across the mouth. Brows: 0 inner → 1 outer. Eyes: +1 upper lid, -1 lower lid, 0 corner. Hair: 0 root → 1 tip. */
  u: number;
  seed: number;
  /** 0..1 how much this point faces the camera (for volumetric shading of the real face). */
  facing: number;
}

export interface EyeInfo {
  x: number;
  y: number;
}

export interface FaceModel {
  points: FacePoint[];
  links: [number, number][];
  linkKinds: LinkKind[];
  eyes: Record<-1 | 1, EyeInfo>;
  mouth: { y: number; halfWidth: number };
  /** Triangles (vertex index triplets) of the cranium + neck shell, so the skin can cover the whole head, not just the face. */
  skinTris: number[];
}

// MediaPipe landmark indices (stable across all MediaPipe face-mesh versions).
const RIGHT_EYE_UPPER = [246, 161, 160, 159, 158, 157, 173];
const RIGHT_EYE_LOWER = [7, 163, 144, 145, 153, 154, 155];
const LEFT_EYE_UPPER = [466, 388, 387, 386, 385, 384, 398];
const LEFT_EYE_LOWER = [249, 390, 373, 374, 380, 381, 382];
const LIP_UPPER = [185, 40, 39, 37, 0, 267, 269, 270, 409, 191, 80, 81, 82, 13, 312, 311, 310, 415];
const LIP_LOWER = [146, 91, 181, 84, 17, 314, 405, 321, 375, 95, 88, 178, 87, 14, 317, 402, 318, 324];
const NOSE = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 327, 64, 294, 48, 278, 115, 344];
const MOUTH_CORNERS = [61, 291];
const CHIN = 152;

/** The current look is a bald holographic head (no hair strands). Flip to bring the hair back. */
const HAIR_ENABLED = false;

export const EYE_Y = 0.1;
export const EYE_X = 0.23;
export const MOUTH_Y = -0.385;

const SKULL_CY = 0.12;
const SKULL_W = 0.62;
const SKULL_H = 0.84;
/** Head ellipsoid (center + radii) for the full 3D head shell behind/around the real face. */
const HEAD_C: [number, number, number] = [0, 0.1, -0.24];
const HEAD_R: [number, number, number] = [0.63, 0.86, 0.8];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const vtx = (i: number): [number, number, number] => [
  CANONICAL_FACE_VERTICES[i * 3],
  CANONICAL_FACE_VERTICES[i * 3 + 1],
  CANONICAL_FACE_VERTICES[i * 3 + 2],
];
const FACE_VERTEX_COUNT = CANONICAL_FACE_VERTICES.length / 3;

/** Face oval as an ordered polygon (the connection list walks the loop edge by edge). */
const OVAL_POLYGON: [number, number][] = (() => {
  const e = FACE_FEATURE_EDGES.oval;
  const order: number[] = [e[0]];
  for (let i = 0; i < e.length; i += 2) order.push(e[i + 1]);
  return order.map((i) => {
    const [x, y] = vtx(i);
    return [x, y];
  });
})();

export function insideFaceOval(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = OVAL_POLYGON.length - 1; i < OVAL_POLYGON.length; j = i++) {
    const [xi, yi] = OVAL_POLYGON[i];
    const [xj, yj] = OVAL_POLYGON[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function insideSkull(x: number, y: number) {
  return (x / SKULL_W) ** 2 + ((y - SKULL_CY) / SKULL_H) ** 2 < 1;
}

export function insideHead(x: number, y: number) {
  return insideFaceOval(x, y) || (y > SKULL_CY - 0.1 && insideSkull(x, y));
}

function skullZ(x: number, y: number) {
  const n = (x / (SKULL_W + 0.05)) ** 2 + ((y - SKULL_CY) / (SKULL_H + 0.05)) ** 2;
  return 0.38 * Math.sqrt(Math.max(0, 1 - n)) - 0.08;
}

/** Height of the head's front surface at (x, y): the real face where it exists, else the skull dome. */
export function surfaceZ(x: number, y: number) {
  if (!insideFaceOval(x, y)) return skullZ(x, y);
  let best = Infinity;
  let z = 0;
  for (let i = 0; i < FACE_VERTEX_COUNT; i++) {
    const [vx, vy, vz] = vtx(i);
    const d = (vx - x) ** 2 + (vy - y) ** 2;
    if (d < best) {
      best = d;
      z = vz;
    }
  }
  return z;
}

export function buildFaceModel(quality: "high" | "low"): FaceModel {
  const hi = quality === "high";
  const rand = mulberry32(20260925);
  const points: FacePoint[] = [];
  const links: [number, number][] = [];
  const linkKinds: LinkKind[] = [];
  const seen = new Set<string>();

  const zMin = -0.18;
  const zMax = 0.55;
  const facingOf = (z: number) => Math.min(1, Math.max(0, (z - zMin) / (zMax - zMin)));
  const add = (x: number, y: number, z: number, region: FaceRegion, side: -1 | 0 | 1, u: number) => {
    points.push({ x, y, z, region, side, u, seed: rand(), facing: facingOf(z) });
    return points.length - 1;
  };
  const link = (a: number, b: number, kind: LinkKind) => {
    if (a === b) return;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    const existing = seen.has(key);
    if (existing) {
      // A feature contour wins over a plain mesh edge on the same pair.
      if (kind === "feature") {
        const idx = links.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a));
        if (idx >= 0) linkKinds[idx] = "feature";
      }
      return;
    }
    seen.add(key);
    links.push([a, b]);
    linkKinds.push(kind);
  };
  const chain = (ids: number[], kind: LinkKind) => {
    for (let i = 0; i < ids.length - 1; i++) link(ids[i], ids[i + 1], kind);
  };
  const skinTris: number[] = [];
  const quadToSkin = (a: number | null, b: number | null, c: number | null, d: number | null) => {
    if (a === null || b === null || c === null || d === null) return;
    skinTris.push(a, b, c, b, d, c);
  };
  const sideOf = (x: number): -1 | 0 | 1 => (x < -0.01 ? -1 : x > 0.01 ? 1 : 0);

  // --- Real face: all 468 landmarks keep their index (point i == landmark i) ---------------
  const eyeUpper = new Set([...RIGHT_EYE_UPPER, ...LEFT_EYE_UPPER]);
  const eyeLower = new Set([...RIGHT_EYE_LOWER, ...LEFT_EYE_LOWER]);
  const eyeAll = new Set([...FACE_FEATURE_EDGES.rightEye, ...FACE_FEATURE_EDGES.leftEye]);
  const brows = new Set([...FACE_FEATURE_EDGES.rightBrow, ...FACE_FEATURE_EDGES.leftBrow]);
  const lipUpper = new Set(LIP_UPPER);
  const lipLower = new Set(LIP_LOWER);
  const nose = new Set(NOSE);
  const oval = new Set(FACE_FEATURE_EDGES.oval);
  const [lcx] = vtx(MOUTH_CORNERS[0]);
  const [rcx] = vtx(MOUTH_CORNERS[1]);
  const mouthHalf = Math.abs(rcx - lcx) / 2;

  const browXRange = (side: -1 | 1) => {
    const xs = [...brows].map((i) => vtx(i)[0]).filter((x) => Math.sign(x) === side).map(Math.abs);
    return [Math.min(...xs), Math.max(...xs)];
  };
  const browRanges = { [-1]: browXRange(-1), [1]: browXRange(1) } as Record<-1 | 1, number[]>;

  for (let i = 0; i < FACE_VERTEX_COUNT; i++) {
    const [x, y, z] = vtx(i);
    const side = sideOf(x);
    let region: FaceRegion = "grid";
    let u = 0;
    if (eyeAll.has(i)) {
      region = "eye";
      u = eyeUpper.has(i) ? 1 : eyeLower.has(i) ? -1 : 0;
    } else if (brows.has(i) && side !== 0) {
      region = "brow";
      const [lo, hi2] = browRanges[side];
      u = (Math.abs(x) - lo) / Math.max(0.001, hi2 - lo);
    } else if (lipUpper.has(i) || MOUTH_CORNERS.includes(i) || i === 78 || i === 308) {
      region = "lipUpper";
      u = Math.max(-1, Math.min(1, x / mouthHalf));
    } else if (lipLower.has(i)) {
      region = "lipLower";
      u = Math.max(-1, Math.min(1, x / mouthHalf));
    } else if (nose.has(i)) {
      region = "nose";
    } else if (oval.has(i)) {
      region = "outline";
    }
    add(x, y, z, region, side, u);
  }
  for (let k = 0; k < FACE_TESSELATION.length; k += 2) link(FACE_TESSELATION[k], FACE_TESSELATION[k + 1], "grid");
  for (const edges of Object.values(FACE_FEATURE_EDGES)) {
    for (let k = 0; k < edges.length; k += 2) link(edges[k], edges[k + 1], "feature");
  }

  // --- Irises + pupils (not in the canonical model — drawn at each eye's real center) -------
  const eyeCenter = (ids: number[]): EyeInfo => {
    const pts = ids.map(vtx);
    return { x: pts.reduce((s, p) => s + p[0], 0) / pts.length, y: pts.reduce((s, p) => s + p[1], 0) / pts.length };
  };
  const eyes: Record<-1 | 1, EyeInfo> = {
    [-1]: eyeCenter([...RIGHT_EYE_UPPER, ...RIGHT_EYE_LOWER]),
    [1]: eyeCenter([...LEFT_EYE_UPPER, ...LEFT_EYE_LOWER]),
  } as Record<-1 | 1, EyeInfo>;
  for (const side of [-1, 1] as const) {
    const { x: cx, y: cy } = eyes[side];
    const cz = surfaceZ(cx, cy) + 0.02;
    const iris: number[] = [];
    const irisN = hi ? 14 : 10;
    for (let i = 0; i < irisN; i++) {
      const th = (i / irisN) * Math.PI * 2;
      iris.push(add(cx + 0.026 * Math.cos(th), cy + 0.026 * Math.sin(th), cz, "iris", side, th));
    }
    chain([...iris, iris[0]], "feature");
    add(cx, cy, cz + 0.005, "pupil", side, 0);
    add(cx + 0.007, cy + 0.008, cz + 0.006, "pupil", side, 1);
  }

  // --- Full 3D head shell: scalp, temples, back of the head down to the nape --------------
  // Rings of a head-shaped ellipsoid, skipping the front where the real face mesh already is.
  const [, chinY] = vtx(CHIN);
  const ringN = hi ? 42 : 22;
  const rings: (number | null)[][] = [];
  const ringYs: number[] = [];
  for (let y = HEAD_C[1] + HEAD_R[1] * 0.985; y >= -0.52; y -= hi ? 0.058 : 0.1) ringYs.push(y);
  for (const y of ringYs) {
    const ny = (y - HEAD_C[1]) / HEAD_R[1];
    const r = Math.sqrt(Math.max(0, 1 - ny * ny));
    // Below the ears the skull narrows into the nape instead of continuing as a full sphere.
    const nape = y < 0 ? 1 - 0.42 * Math.min(1, -y / 0.52) : 1;
    const ring: (number | null)[] = [];
    for (let k = 0; k < ringN; k++) {
      const a = (k / ringN) * Math.PI * 2;
      const x = HEAD_R[0] * r * nape * Math.sin(a);
      const z = HEAD_C[2] + HEAD_R[2] * r * (y < 0 ? 0.85 + 0.15 * nape : 1) * Math.cos(a);
      if (z > -0.14 && (insideFaceOval(x * 0.97, y) || y < 0.05)) {
        ring.push(null); // the real face (or the jaw/throat region under it) covers this part
        continue;
      }
      ring.push(add(x, y, z, "outline", sideOf(x), 0));
    }
    rings.push(ring);
  }
  for (let r = 0; r < rings.length; r++) {
    for (let k = 0; k < ringN; k++) {
      const a = rings[r][k];
      const b = rings[r][(k + 1) % ringN];
      if (a !== null && b !== null) link(a, b, "grid");
      if (r + 1 < rings.length) {
        const c = rings[r + 1][k];
        const d = rings[r + 1][(k + 1) % ringN];
        if (a !== null && c !== null) link(a, c, "grid");
        if (a !== null && d !== null && k % 2 === r % 2) link(a, d, "grid");
        quadToSkin(a, b, c, d);
      }
    }
  }
  const crown = add(0, HEAD_C[1] + HEAD_R[1], HEAD_C[2], "outline", 0, 0);
  rings[0].forEach((id, k) => {
    if (id !== null) link(crown, id, "grid");
    const next = rings[0][(k + 1) % ringN];
    if (id !== null && next !== null) skinTris.push(crown, id, next);
  });
  // Stitch the face's outer edge to the head shell so it reads as one continuous head.
  const shellIds = rings.flat().filter((id): id is number => id !== null);
  const ovalBest = new Map<number, number>();
  for (const i of FACE_FEATURE_EDGES.oval) {
    const p = points[i];
    let best = -1;
    let bestD = 0.2 * 0.2;
    for (const j of shellIds) {
      const q = points[j];
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2 + (q.z - p.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    if (best >= 0) {
      link(i, best, "grid");
      ovalBest.set(i, best);
    }
  }
  // Close the seam between the face mesh and the cranium with skin triangles along the oval.
  for (let e = 0; e + 1 < FACE_FEATURE_EDGES.oval.length; e += 2) {
    const a = FACE_FEATURE_EDGES.oval[e];
    const b = FACE_FEATURE_EDGES.oval[e + 1];
    const sa = ovalBest.get(a);
    const sb = ovalBest.get(b);
    if (sa === undefined || sb === undefined) continue;
    skinTris.push(a, b, sa);
    if (sa !== sb) skinTris.push(b, sb, sa);
  }

  // --- Ears (3D: a C-shaped rim in the side plane) ----------------------------------------
  for (const side of [-1, 1] as const) {
    const ear: number[] = [];
    const earN = hi ? 12 : 8;
    for (let i = 0; i <= earN; i++) {
      const a = -Math.PI * 0.15 + (Math.PI * 1.3 * i) / earN;
      ear.push(add(side * (0.6 + 0.02 * Math.sin(a)), 0.03 + 0.15 * Math.cos(a), -0.2 + 0.1 * Math.sin(a), "outline", side, i / earN));
    }
    chain(ear, "feature");
    const inner: number[] = [];
    for (let i = 0; i <= 5; i++) {
      const a = (Math.PI * i) / 5;
      inner.push(add(side * 0.615, 0.02 + 0.07 * Math.cos(a), -0.2 + 0.05 * Math.sin(a), "outline", side, 0));
    }
    chain(inner, "feature");
  }

  // --- Neck: volumetric rings from under the jaw/nape down to the collarbones --------------
  const neckRings: (number | null)[][] = [];
  const neckN = hi ? 18 : 12;
  const neckTop = -0.5;
  const neckBottom = -1.3;
  const neckLevels = hi ? 10 : 7;
  for (let l = 0; l <= neckLevels; l++) {
    const t = l / neckLevels;
    const y = neckTop + (neckBottom - neckTop) * t;
    const rx = 0.27 - 0.025 * Math.sin(t * Math.PI) + 0.07 * t * t; // slight waist, then widens into the base
    const rz = 0.25;
    const cz = -0.22 + 0.1 * t; // the neck leans forward as it goes down, like a real one
    const ring: (number | null)[] = [];
    for (let k = 0; k < neckN; k++) {
      const a = (k / neckN) * Math.PI * 2;
      const x = rx * Math.sin(a);
      const z = cz + rz * Math.cos(a);
      if (z > -0.02 && y > chinY - 0.02 && insideFaceOval(x, y)) {
        ring.push(null);
        continue;
      }
      ring.push(add(x, y, z, "outline", sideOf(x), 0));
    }
    neckRings.push(ring);
  }
  for (let r = 0; r < neckRings.length; r++) {
    for (let k = 0; k < neckN; k++) {
      const a = neckRings[r][k];
      const b = neckRings[r][(k + 1) % neckN];
      if (a !== null && b !== null) link(a, b, "grid");
      if (r + 1 < neckRings.length) {
        const c = neckRings[r + 1][k];
        if (a !== null && c !== null) link(a, c, "grid");
        quadToSkin(a, b, c, neckRings[r + 1][(k + 1) % neckN]);
      }
    }
  }
  // Tie the neck's top ring into the nape of the head shell.
  const lastShellRing = rings[rings.length - 1];
  neckRings[0].forEach((id, k) => {
    const target = lastShellRing[Math.round((k / neckN) * ringN) % ringN];
    if (id !== null && target !== null) link(id, target, "grid");
  });
  // Sternocleidomastoid (behind the ear → collarbone notch) and trapezius → shoulders.
  const curve = (from: [number, number, number], ctrl: [number, number, number], to: [number, number, number], n: number, side: -1 | 0 | 1) => {
    const ids: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      ids.push(
        add(
          u * u * from[0] + 2 * u * t * ctrl[0] + t * t * to[0],
          u * u * from[1] + 2 * u * t * ctrl[1] + t * t * to[1],
          u * u * from[2] + 2 * u * t * ctrl[2] + t * t * to[2],
          "outline",
          side,
          t
        )
      );
    }
    chain(ids, "feature");
    return ids;
  };
  for (const side of [-1, 1] as const) {
    curve([side * 0.5, -0.12, -0.24], [side * 0.26, -0.8, 0.02], [side * 0.05, -1.3, 0.1], hi ? 12 : 8, side);
    curve([side * 0.27, -0.95, -0.3], [side * 0.45, -1.22, -0.3], [side * 0.82, -1.36, -0.24], hi ? 10 : 7, side);
    curve([side * 0.06, -1.33, 0.1], [side * 0.4, -1.28, 0.08], [side * 0.8, -1.38, -0.12], hi ? 10 : 7, side);
  }

  // Spinal cord running down the neck, continuing the brainstem.
  const cord: number[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    cord.push(add(0, -0.25 - 1.05 * t, -0.34 + 0.08 * t, "outline", 0, t));
  }
  chain(cord, "feature");

  // --- Hair: long strands with a middle part, framing the face and falling past the shoulders --
  // Roots sit on the scalp above the hairline; each strand sweeps over the head toward the side
  // (behind the ear) and then falls. Nothing ever crosses in front of the face.
  const scalp = (d: [number, number, number], k = 1.07): [number, number, number] => [
    HEAD_R[0] * d[0] * k,
    HEAD_C[1] + HEAD_R[1] * d[1] * k,
    HEAD_C[2] + HEAD_R[2] * d[2] * k,
  ];
  const nrm = (v: [number, number, number]): [number, number, number] => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const strandCount = HAIR_ENABLED ? (hi ? 210 : 80) : 0;
  const strandLen = hi ? 24 : 13;
  let made = 0;
  let tries = 0;
  while (made < strandCount && tries < strandCount * 40) {
    tries++;
    const root = nrm([rand() * 2 - 1, 0.25 + rand() * 0.75, rand() * 2 - 1]);
    const [rx, ry, rz] = scalp(root);
    // Hairline: in front, roots start only above the forehead; keep a clean middle part.
    if (rz > -0.05 && ry < 0.56 - 0.25 * rx * rx) continue;
    if (Math.abs(rx) < 0.025) continue;
    const side = (rx < 0 ? -1 : 1) as -1 | 1;
    const back = root[2] < -0.25;
    // Where the strand leaves the scalp: behind the ear on its side (or the back of the head).
    // Layered volume: each strand sits at its own height off the scalp.
    const layer = 1.06 + rand() * 0.1;
    const exitDir = nrm(back ? [side * 0.55, -0.15, -0.95] : [side * 0.97, -0.05, root[2] * 0.4 - 0.3]);
    const end: [number, number, number] = back
      ? [side * (0.1 + rand() * 0.42), -0.85 - rand() * 0.4, HEAD_C[2] - 0.66 - rand() * 0.2]
      : [side * (0.66 + rand() * 0.26), -0.7 - rand() * 0.5, -0.12 - rand() * 0.38];
    const ids: number[] = [];
    const sweep = 0.42;
    const exitP = scalp(exitDir, layer + 0.04);
    const wavePhase = rand() * Math.PI * 2;
    for (let k = 0; k < strandLen; k++) {
      const u = k / (strandLen - 1);
      let p: [number, number, number];
      if (u <= sweep) {
        const t = u / sweep;
        p = scalp(nrm([root[0] + (exitDir[0] - root[0]) * t, root[1] + (exitDir[1] - root[1]) * t, root[2] + (exitDir[2] - root[2]) * t]), layer + 0.04 * t);
      } else {
        const t = (u - sweep) / (1 - sweep);
        const e = t * t * (3 - 2 * t);
        p = [
          exitP[0] + (end[0] - exitP[0]) * e + side * 0.05 * Math.sin(t * Math.PI * 2.2 + wavePhase) + side * 0.07 * Math.sin(t * Math.PI),
          exitP[1] + (end[1] - exitP[1]) * t,
          exitP[2] + (end[2] - exitP[2]) * e + 0.035 * Math.cos(t * Math.PI * 2 + wavePhase),
        ];
        // Never in front of the face or neck: push outward past the jaw/cheek line.
        if (!back && p[2] > -0.3 && Math.abs(p[0]) < 0.6) p[0] = side * 0.6;
      }
      const id = points.length;
      points.push({ x: p[0], y: p[1], z: p[2], region: "hair", side, u, seed: rand(), facing: 0.5 });
      ids.push(id);
    }
    chain(ids, "hair");
    made++;
  }

  // Combed cap: dense lines from the middle part down over the whole scalp (behind the ears
  // and the nape), so no patch of skull ever shows between the long strands.
  const capLines = HAIR_ENABLED ? (hi ? 40 : 24) : 0;
  const capLen = hi ? 16 : 10;
  for (const side of [-1, 1] as const) {
    for (let c = 0; c < capLines; c++) {
      const phi = 0.95 + (c / (capLines - 1)) * (Math.PI - 0.95 + 0.55); // forehead → over the top → nape
      const start = nrm([side * 0.04, Math.sin(phi), Math.cos(phi)]);
      const back = start[2] < -0.3;
      const endDir = nrm(back ? [side * 0.6, start[1] * 0.3 - 0.35, -0.9] : [side, -0.12, start[2] * 0.55 - 0.25]);
      const k = 1.065 + rand() * 0.03;
      const ids: number[] = [];
      for (let q = 0; q < capLen; q++) {
        const t = q / (capLen - 1);
        const d = nrm([start[0] + (endDir[0] - start[0]) * t, start[1] + (endDir[1] - start[1]) * t, start[2] + (endDir[2] - start[2]) * t]);
        const p = scalp(d, k + 0.02 * t);
        ids.push(points.length);
        points.push({ x: p[0], y: p[1], z: p[2], region: "hair", side, u: t * 0.35, seed: rand(), facing: 0.5 });
      }
      chain(ids, "hair");
    }
  }

  // --- Halo of synapses around the head (a sparse 3D cloud, so it holds up when rotating) ----
  const haloIds: number[] = [];
  const haloTarget = hi ? 90 : 45;
  let attempts = 0;
  while (haloIds.length < haloTarget && attempts < haloTarget * 100) {
    attempts++;
    const dir = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
    const l = Math.hypot(dir[0], dir[1], dir[2]);
    if (l < 0.2 || l > 1) continue;
    const r = 1.18 + rand() * 0.28;
    const x = (dir[0] / l) * HEAD_R[0] * r;
    const y = HEAD_C[1] + (dir[1] / l) * HEAD_R[1] * r;
    const z = HEAD_C[2] + (dir[2] / l) * HEAD_R[2] * r;
    if (y < -0.55) continue; // keep the neck/shoulders clear
    let ok = true;
    for (const j of haloIds) {
      if ((points[j].x - x) ** 2 + (points[j].y - y) ** 2 + (points[j].z - z) ** 2 < 0.13 * 0.13) {
        ok = false;
        break;
      }
    }
    if (ok) haloIds.push(add(x, y, z, "halo", sideOf(x), 0));
  }
  for (const i of haloIds) {
    const p = points[i];
    haloIds
      .filter((j) => j !== i)
      .map((j) => ({ j, d: (points[j].x - p.x) ** 2 + (points[j].y - p.y) ** 2 + (points[j].z - p.z) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach(({ j, d }) => {
        if (d < 0.3 * 0.3) link(i, j, "web");
      });
  }

  return { points, links, linkKinds, eyes, mouth: { y: MOUTH_Y, halfWidth: mouthHalf }, skinTris };
}
