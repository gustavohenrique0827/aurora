/**
 * A human brain made of synapse nodes, in its own local space (centered on the brain, +Z =
 * front). What makes it read as a real brain is the gyri: the maze of folds is drawn as the
 * contour lines of a fold field over each hemisphere (marching squares on a lat/long grid),
 * plus the lateral (Sylvian) fissure, the central sulcus, the longitudinal fissure between the
 * hemispheres, the cerebellum with its folia and the brainstem. Also where each agent lives
 * (a lobe per agent) and the AURORA core (thalamus). Pure data — SynapseFace animates it.
 */

export type BrainRegion = "cortex" | "sulcus" | "cerebellum" | "stem";
export type BrainLinkKind = "fold" | "web";

export interface BrainPoint {
  x: number;
  y: number;
  z: number;
  region: BrainRegion;
  seed: number;
}

export interface BrainModel {
  points: BrainPoint[];
  links: [number, number][];
  linkKinds: BrainLinkKind[];
  /** Agent anchor on the cortex, keyed by agentRoster key. */
  agentAnchors: Record<string, [number, number, number]>;
  core: [number, number, number];
  /** Solid folded cortex surface (both hemispheres): grooves along every sulcus, for real shading. */
  surface: { positions: Float32Array; indices: Uint32Array };
}

type V3 = [number, number, number];

const HEMI_OFFSET = 0.26;
const HEMI_R: V3 = [0.27, 0.34, 0.56];

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

/** Gyri field: its zero set is a maze of meandering folds, like a real cortex. */
function gyri([x, y, z]: V3, side: number) {
  const s = side * 1.7;
  return (
    Math.sin(19 * x + 3.4 * Math.sin(11 * z + s) + s) +
    Math.sin(18 * y + 3.1 * Math.sin(10 * x - s)) +
    Math.sin(20 * z + 3.6 * Math.sin(12 * y + s))
  );
}

/** Point on one hemisphere's surface along unit direction d (lobes shaped, medial wall flat). */
function cortexPoint(side: -1 | 1, d: V3): V3 {
  const [dx, dy, dz] = d;
  let ey = dy * HEMI_R[1];
  const ez = dz * HEMI_R[2] * (dz < 0 ? 1.04 : 1);
  // Temporal lobe hangs lower on the side, below the lateral fissure.
  if (dy < -0.1 && Math.sign(dx) === side) ey -= 0.07 * Math.abs(dx) * (1 - Math.abs(dz) * 0.6);
  // Frontal lobe a bit lower than the parietal crown; the occipital pole tapers.
  ey *= 1 + 0.1 * Math.max(0, -dz) * Math.max(0, dy);
  if (dz < -0.6) ey *= 0.92;
  const lateralDip = Math.sign(dx) === side ? 1 - 0.035 * Math.exp(-(((dy + 0.12 + 0.25 * dz) / 0.09) ** 2)) : 1; // Sylvian groove
  let x = side * HEMI_OFFSET + dx * HEMI_R[0] * lateralDip;
  if (side * x < 0.01) x = side * (0.01 + 0.012 * Math.abs(dy));
  return [x, ey * lateralDip, ez * lateralDip];
}

/** Surface point with the sulcus carved in: the fold field's zero set becomes a groove. */
function foldedPoint(side: -1 | 1, d: V3, lift = 1): V3 {
  const p = cortexPoint(side, d);
  const g = (1 - 0.05 * Math.exp(-((gyri(d, side) / 0.55) ** 2))) * lift;
  const cx = side * HEMI_OFFSET;
  return [cx + (p[0] - cx) * g, p[1] * g, p[2] * g];
}

const normalize = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

const dirFromLatLon = (lat: number, lon: number): V3 => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];

/** Which lobe each agent lives in (side + direction on that hemisphere). */
const AGENT_LOBES: Record<string, { side: -1 | 1; dir: V3 }> = {
  ceo: { side: -1, dir: [-0.3, 0.45, 0.85] }, // prefrontal: strategy
  cto: { side: 1, dir: [0.3, 0.45, 0.85] },
  cfo: { side: -1, dir: [-0.55, 0.8, -0.2] }, // parietal
  cco: { side: 1, dir: [0.55, 0.8, -0.2] },
  coo: { side: -1, dir: [-0.3, 0.95, 0.1] }, // motor strip: execution
  cmo: { side: 1, dir: [0.3, 0.95, 0.1] },
  cpo: { side: -1, dir: [-0.85, 0.2, 0.5] }, // lateral frontal
  cio: { side: 1, dir: [0.85, 0.2, 0.5] },
  chro: { side: -1, dir: [-0.95, -0.35, 0.05] }, // temporal: people/memory
  general_counsel: { side: 1, dir: [0.95, -0.35, 0.05] },
  radar: { side: -1, dir: [-0.45, 0.15, -0.9] }, // occipital: vision
  closer: { side: 1, dir: [0.45, 0.15, -0.9] },
  sdr: { side: 1, dir: [0.75, -0.55, -0.35] }, // lower temporal, near the stem: conversation reflex
};

export function buildBrainModel(quality: "high" | "low"): BrainModel {
  const hi = quality === "high";
  const rand = mulberry32(424242);
  const points: BrainPoint[] = [];
  const links: [number, number][] = [];
  const linkKinds: BrainLinkKind[] = [];
  const seen = new Set<string>();
  const add = (p: V3, region: BrainRegion) => {
    points.push({ x: p[0], y: p[1], z: p[2], region, seed: rand() });
    return points.length - 1;
  };
  const link = (a: number, b: number, kind: BrainLinkKind) => {
    if (a === b) return;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push([a, b]);
    linkKinds.push(kind);
  };

  // --- Gyri: contour lines of the fold field on each hemisphere (marching squares) ---------
  const NLAT = hi ? 84 : 48;
  const NLON = hi ? 150 : 84;
  const surfPos: number[] = [];
  const surfIdx: number[] = [];
  const latMin = -Math.PI / 2 + 0.12;
  const latMax = Math.PI / 2 - 0.05;
  for (const side of [-1, 1] as const) {
    const val: number[][] = [];
    const dirs: V3[][] = [];
    for (let i = 0; i <= NLAT; i++) {
      const lat = latMin + ((latMax - latMin) * i) / NLAT;
      val.push([]);
      dirs.push([]);
      for (let j = 0; j < NLON; j++) {
        const lon = (j / NLON) * Math.PI * 2;
        const d = dirFromLatLon(lat, lon);
        dirs[i].push(d);
        // Underside toward the back belongs to the cerebellum; the medial wall stays smooth.
        const reserved = (d[1] < -0.45 && d[2] < 0.1) || Math.sign(d[0]) !== side;
        val[i].push(reserved ? NaN : gyri(d, side));
      }
    }
    // Solid cortex surface for this hemisphere (same grid, cells in the reserved area skipped).
    const base = surfPos.length / 3;
    for (let i = 0; i <= NLAT; i++) {
      for (let j = 0; j < NLON; j++) {
        const q = foldedPoint(side, dirs[i][j]);
        surfPos.push(q[0], q[1], q[2]);
      }
    }
    for (let i = 0; i < NLAT; i++) {
      for (let j = 0; j < NLON; j++) {
        const j2 = (j + 1) % NLON;
        if ([val[i][j], val[i][j2], val[i + 1][j2], val[i + 1][j]].some((v) => Number.isNaN(v))) continue;
        const a = base + i * NLON + j;
        const b = base + i * NLON + j2;
        const c = base + (i + 1) * NLON + j2;
        const d = base + (i + 1) * NLON + j;
        surfIdx.push(a, c, b, a, d, c);
      }
    }
    const edgePoint = new Map<string, number>();
    const crossing = (i1: number, j1: number, i2: number, j2: number) => {
      const key = i1 < i2 || (i1 === i2 && j1 < j2) ? `${i1},${j1}|${i2},${j2}` : `${i2},${j2}|${i1},${j1}`;
      const cached = edgePoint.get(key);
      if (cached !== undefined) return cached;
      const a = val[i1][j1];
      const b = val[i2][j2];
      const t = a / (a - b);
      const d1 = dirs[i1][j1];
      const d2 = dirs[i2][j2];
      const d = normalize([d1[0] + (d2[0] - d1[0]) * t, d1[1] + (d2[1] - d1[1]) * t, d1[2] + (d2[2] - d1[2]) * t]);
      const id = add(foldedPoint(side, d, 1.006), "cortex");
      edgePoint.set(key, id);
      return id;
    };
    for (let i = 0; i < NLAT; i++) {
      for (let j = 0; j < NLON; j++) {
        const j2 = (j + 1) % NLON;
        const c = [val[i][j], val[i][j2], val[i + 1][j2], val[i + 1][j]];
        if (c.some((v) => Number.isNaN(v))) continue;
        const corners: [number, number][] = [[i, j], [i, j2], [i + 1, j2], [i + 1, j]];
        const hits: number[] = [];
        for (let e = 0; e < 4; e++) {
          const a = c[e];
          const b = c[(e + 1) % 4];
          if ((a < 0) !== (b < 0)) {
            const [ia, ja] = corners[e];
            const [ib, jb] = corners[(e + 1) % 4];
            hits.push(crossing(ia, ja, ib, jb));
          }
        }
        if (hits.length === 2) link(hits[0], hits[1], "fold");
        else if (hits.length === 4) {
          link(hits[0], hits[1], "fold");
          link(hits[2], hits[3], "fold");
        }
      }
    }
  }

  // --- Landmark fissures (brighter): lateral (Sylvian) fissure and central sulcus -----------
  const fissure = (side: -1 | 1, from: V3, to: V3, n: number) => {
    const ids: number[] = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const d = normalize([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]);
      ids.push(add(foldedPoint(side, d, 1.012), "sulcus"));
    }
    for (let k = 0; k < ids.length - 1; k++) link(ids[k], ids[k + 1], "fold");
  };
  for (const side of [-1, 1] as const) {
    fissure(side, [side * 0.8, -0.2, 0.55], [side * 0.85, 0.25, -0.45], hi ? 22 : 14); // lateral fissure
    fissure(side, [side * 0.12, 0.99, 0.05], [side * 0.95, 0.05, 0.12], hi ? 22 : 14); // central sulcus
  }
  // Longitudinal fissure: the gap line between the hemispheres, front to back over the top.
  for (const side of [-1, 1] as const) fissure(side, [side * 0.02, 0.2, 0.98], [side * 0.02, 0.35, -0.94], hi ? 30 : 18);

  // --- Cerebellum: parallel folia on its back/under half ------------------------------------
  const cb = { cy: -0.3, cz: -0.36, rx: 0.34, ry: 0.15, rz: 0.2 };
  const folia = hi ? 13 : 8;
  const around = hi ? 30 : 18;
  for (let f = 0; f < folia; f++) {
    const v = -0.85 + (1.7 * f) / (folia - 1);
    const ring: number[] = [];
    for (let k = 0; k <= around; k++) {
      const a = Math.PI * 0.95 + (Math.PI * 1.1 * k) / around;
      const r = Math.sqrt(1 - v * v) * (1 + 0.03 * Math.sin(k * 1.7 + f));
      ring.push(add([cb.rx * r * Math.cos(a), cb.cy + cb.ry * v, cb.cz + cb.rz * r * Math.sin(a)], "cerebellum"));
    }
    for (let k = 0; k < ring.length - 1; k++) link(ring[k], ring[k + 1], "fold");
  }

  // --- Brainstem (continues into the spinal cord drawn in the neck) -----------------------
  const stemTop: V3 = [0, -0.14, -0.1];
  const stemBottom: V3 = [0, -0.66, -0.08];
  const strands = hi ? 7 : 5;
  const stemSteps = hi ? 14 : 9;
  const strandIds: number[][] = [];
  for (let s = 0; s < strands; s++) {
    const a = (s / strands) * Math.PI * 2;
    const ids: number[] = [];
    for (let k = 0; k <= stemSteps; k++) {
      const t = k / stemSteps;
      const r = 0.075 * (1 - 0.4 * t) * (1 + 0.25 * Math.exp(-(((t - 0.35) / 0.12) ** 2))); // pons bulge
      ids.push(add([stemTop[0] + r * Math.cos(a), stemTop[1] + (stemBottom[1] - stemTop[1]) * t, stemTop[2] + (stemBottom[2] - stemTop[2]) * t + r * Math.sin(a)], "stem"));
    }
    for (let k = 0; k < ids.length - 1; k++) link(ids[k], ids[k + 1], "fold");
    strandIds.push(ids);
  }
  for (let k = 0; k <= stemSteps; k += 3) {
    for (let s = 0; s < strands; s++) link(strandIds[s][k], strandIds[(s + 1) % strands][k], "fold");
  }

  const agentAnchors: Record<string, V3> = {};
  for (const [key, lobe] of Object.entries(AGENT_LOBES)) {
    const p = cortexPoint(lobe.side, normalize(lobe.dir));
    agentAnchors[key] = [p[0] * 1.07, p[1] * 1.07, p[2] * 1.07];
  }

  return {
    points,
    links,
    linkKinds,
    agentAnchors,
    core: [0, -0.02, 0.02],
    surface: { positions: new Float32Array(surfPos), indices: new Uint32Array(surfIdx) },
  };
}
