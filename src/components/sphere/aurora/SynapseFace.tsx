import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { useJarvisStore } from "../../../state/store";
import type { SphereMode } from "../../../state/slices/sphereSlice";
import { AGENT_ROSTER, resolveAgentLive, type AgentLiveStatus } from "./agentRoster";
import { buildFaceModel, MOUTH_Y, type FaceRegion } from "./faceModel";
import { buildBrainModel } from "./brainModel";

interface SynapseFaceProps {
  baseColor: [number, number, number];
  mode: SphereMode;
  lowPower: boolean;
}

const INTRO_DURATION = 3.2;
const RESUMMON_AFTER_IDLE_S = 45;
const PULSE_POOL = 80;
const ARC_SEGMENTS = 18;
const HEAD_SCALE = 1.3;
/** Lifts the head so the neck clears the greeting + prompt bar overlaid at the bottom. */
const HEAD_OFFSET_Y = 0.3;
const WHITE = new THREE.Color(1, 1, 1);
const HAIR_A = new THREE.Color("#c9611c");
const BLUE = new THREE.Color("#5f7dff");
const WARM = new THREE.Color("#ff9a3c");
const HAIR_BLUE = new THREE.Color("#7f8cff");
const HAIR_B = new THREE.Color("#f2b685");

/** Brain inside the cranium (head space) and where it goes when opened: out in front of her face. */
/** Interval between heavy geometry rebuilds (see useFrame). */
const HEAVY_INTERVAL_S = 1 / 30 - 0.002;
const BRAIN_CLOSED = { pos: new THREE.Vector3(0, 0.4, -0.3), scale: 1 };
const BRAIN_OPEN = { pos: new THREE.Vector3(0, 0.12, 1.0), scale: 1.35 };

const REGION_BRIGHTNESS: Record<FaceRegion, number> = {
  fill: 0.95,
  halo: 0.8,
  grid: 1.05,
  outline: 1.3,
  eye: 1.9,
  iris: 2.1,
  pupil: 2.8,
  brow: 1.55,
  nose: 1.3,
  lipUpper: 1.75,
  lipLower: 1.75,
  hair: 0.5,
};

const REGION_INTRO_DELAY: Record<FaceRegion, [number, number]> = {
  halo: [0.05, 0.7],
  outline: [0.15, 0.6],
  fill: [0.25, 0.9],
  grid: [0.45, 0.8],
  nose: [1.0, 0.2],
  brow: [1.1, 0.15],
  eye: [1.15, 0.15],
  lipUpper: [1.2, 0.15],
  lipLower: [1.2, 0.15],
  iris: [1.35, 0.1],
  pupil: [1.4, 0.05],
  hair: [0.55, 1.0],
};

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function makeDotTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

interface Pulse {
  active: boolean;
  agent: number;
  /** "face": runs out of the brain across her face. "brain": runs inside the (open) brain. */
  kind: "face" | "brain";
  target: number;
  progress: number;
  speed: number;
}

const attr = (arr: Float32Array, name: string, count: number) => (
  <bufferAttribute attach={`attributes-${name}`} args={[arr, 3]} count={count} array={arr} itemSize={3} />
);

/**
 * Aurora as a full human head of synapses (real face geometry, skull, nape, neck) with a real
 * brain inside it. Each agent lives in a lobe of that brain; synapse pulses run out of the
 * brain across her face. Tapping the AURORA core opens the brain (it comes out in front of her,
 * grows and turns); tapping an agent opens its card. Blinks, looks at the pointer, and moves
 * the mouth/jaw with the loudness of her real voice (store.speechLevel).
 */
export function SynapseFace({ baseColor, mode, lowPower }: SynapseFaceProps) {
  const quality = lowPower ? "low" : "high";
  const head = useMemo(() => buildFaceModel(quality), [quality]);
  const brain = useMemo(() => buildBrainModel(quality), [quality]);
  const n = head.points.length;
  const bn = brain.points.length;

  const dotTexture = useMemo(() => makeDotTexture(), []);
  useEffect(() => () => dotTexture.dispose(), [dotTexture]);

  // --- Head render groups (node sizes read as a connectome: hubs + small synapses) ------------
  const headGroups = useMemo(() => {
    const byKey: Record<string, number[]> = { feature: [], grid: [], shell: [], halo: [], hair: [] };
    head.points.forEach((p, i) => {
      if (p.region === "hair") byKey.hair.push(i);
      else if (p.region === "grid") byKey.grid.push(i);
      else if (p.region === "outline") byKey.shell.push(i);
      else if (p.region === "halo" || p.region === "fill") byKey.halo.push(i);
      else byKey.feature.push(i);
    });
    return [
      { key: "grid", idx: byKey.grid, size: 0.03 },
      { key: "shell", idx: byKey.shell, size: 0.028 },
      { key: "halo", idx: byKey.halo, size: 0.06 },
      { key: "hair", idx: byKey.hair, size: 0.016 },
      { key: "feature", idx: byKey.feature, size: 0.055 },
    ].map((g) => ({ ...g, pos: new Float32Array(g.idx.length * 3), col: new Float32Array(g.idx.length * 3) }));
  }, [head]);

  const brainGroups = useMemo(() => {
    // The folds are drawn as lines; only a sparse subset of cortex points glow as synapse nodes.
    const nodes: number[] = [];
    const folds: number[] = [];
    brain.points.forEach((p, i) => {
      if (p.region === "cortex") {
        if (p.seed > 0.88) nodes.push(i);
      } else folds.push(i);
    });
    return [
      { key: "nodes", idx: nodes, size: 0.03 },
      { key: "folds", idx: folds, size: 0.014 },
    ].map((g) => {
      const pos = new Float32Array(g.idx.length * 3);
      g.idx.forEach((i, k) => {
        pos[k * 3] = brain.points[i].x;
        pos[k * 3 + 1] = brain.points[i].y;
        pos[k * 3 + 2] = brain.points[i].z;
      });
      return { ...g, pos, col: new Float32Array(g.idx.length * 3) };
    });
  }, [brain]);

  const scatter = useMemo(() => {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 0.6;
      const s = Math.sqrt(1 - u * u);
      out[i * 3] = r * s * Math.cos(th);
      out[i * 3 + 1] = r * u;
      out[i * 3 + 2] = r * s * Math.sin(th);
    }
    return out;
  }, [n]);

  const agentAnchors = useMemo(
    () => AGENT_ROSTER.map((a) => new THREE.Vector3(...(brain.agentAnchors[a.key] ?? [0, 0, 0]))),
    [brain]
  );
  const coreLocal = useMemo(() => new THREE.Vector3(...brain.core), [brain]);
  const agentColors = useMemo(() => AGENT_ROSTER.map((a) => new THREE.Color(a.color)), []);

  // Each brain point glows with the color of the agent whose lobe it belongs to.
  const brainTint = useMemo(
    () =>
      brain.points.map((p) => {
        const ranked = agentAnchors
          .map((h, a) => ({ a, d: (h.x - p.x) ** 2 + (h.y - p.y) ** 2 + (h.z - p.z) ** 2 }))
          .sort((x, y) => x.d - y.d);
        const [first, second] = ranked;
        const w1 = 1 / (first.d + 0.01);
        const w2 = 1 / (second.d + 0.01);
        return agentColors[first.a].clone().multiplyScalar(w1 / (w1 + w2)).add(agentColors[second.a].clone().multiplyScalar(w2 / (w1 + w2)));
      }),
    [brain, agentAnchors, agentColors]
  );
  // The face mesh picks up the color of the brain region right behind it.
  const headTint = useMemo(
    () =>
      head.points.map((p) => {
        const local = new THREE.Vector3(p.x, p.y, p.z).sub(BRAIN_CLOSED.pos);
        const ranked = agentAnchors.map((h, a) => ({ a, d: (h.x - local.x) ** 2 + (h.y - local.y) ** 2 })).sort((x, y) => x.d - y.d);
        const [first, second] = ranked;
        const w1 = 1 / (first.d + 0.02);
        const w2 = 1 / (second.d + 0.02);
        return agentColors[first.a].clone().multiplyScalar(w1 / (w1 + w2)).add(agentColors[second.a].clone().multiplyScalar(w2 / (w1 + w2)));
      }),
    [head, agentAnchors, agentColors]
  );

  const faceTargets = useMemo(
    () => head.points.map((p, i) => (["grid", "eye", "brow", "nose", "lipUpper", "lipLower"].includes(p.region) ? i : -1)).filter((i) => i >= 0),
    [head]
  );
  const cortexTargets = useMemo(() => brain.points.map((p, i) => (p.region === "cortex" ? i : -1)).filter((i) => i >= 0), [brain]);

  const arcCurves = useMemo(
    () =>
      agentAnchors.map((h) => {
        const mid = coreLocal.clone().add(h).multiplyScalar(0.5);
        const ctrl = mid.clone().add(mid.clone().normalize().multiplyScalar(0.1));
        return new THREE.QuadraticBezierCurve3(coreLocal.clone(), ctrl, h.clone()).getPoints(ARC_SEGMENTS);
      }),
    [agentAnchors, coreLocal]
  );

  const buffers = useMemo(
    () => ({
      headPos: new Float32Array(n * 3),
      headCol: new Float32Array(n * 3),
      headLinePos: new Float32Array(head.links.length * 6),
      headLineCol: new Float32Array(head.links.length * 6),
      brainCol: new Float32Array(bn * 3),
      brainLinePos: new Float32Array(brain.links.length * 6),
      brainLineCol: new Float32Array(brain.links.length * 6),
      arcPos: new Float32Array(AGENT_ROSTER.length * ARC_SEGMENTS * 6),
      arcCol: new Float32Array(AGENT_ROSTER.length * ARC_SEGMENTS * 6),
      pulsePos: new Float32Array(PULSE_POOL * 3),
      pulseCol: new Float32Array(PULSE_POOL * 3),
    }),
    [n, bn, head, brain]
  );
  // Brain line positions and arc positions are static in brain space.
  useMemo(() => {
    brain.links.forEach(([a, b], li) => {
      const o = li * 6;
      const pa = brain.points[a];
      const pb = brain.points[b];
      buffers.brainLinePos.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], o);
    });
    arcCurves.forEach((curve, ai) => {
      for (let s = 0; s < ARC_SEGMENTS; s++) {
        const o = (ai * ARC_SEGMENTS + s) * 6;
        buffers.arcPos.set([curve[s].x, curve[s].y, curve[s].z, curve[s + 1].x, curve[s + 1].y, curve[s + 1].z], o);
      }
    });
  }, [brain, arcCurves, buffers]);

  const headGroupRef = useRef<THREE.Group>(null);
  const brainGroupRef = useRef<THREE.Group>(null);
  const headGeomRefs = useRef<(THREE.BufferGeometry | null)[]>([]);
  const brainGeomRefs = useRef<(THREE.BufferGeometry | null)[]>([]);
  const headLineGeomRef = useRef<THREE.BufferGeometry>(null);
  const brainLineGeomRef = useRef<THREE.BufferGeometry>(null);
  const arcGeomRef = useRef<THREE.BufferGeometry>(null);
  const pulseGeomRef = useRef<THREE.BufferGeometry>(null);
  const agentGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const agentCoreRefs = useRef<(THREE.Mesh | null)[]>([]);
  const agentHaloRefs = useRef<(THREE.Mesh | null)[]>([]);
  const agentRingRefs = useRef<(THREE.Mesh | null)[]>([]);
  const auroraCoreRef = useRef<THREE.Mesh>(null);
  const auroraHaloRef = useRef<THREE.Mesh>(null);

  // Sized per model: lowPower (FPS drop) swaps to lighter models, so these follow them.
  const headFlash = useMemo(() => ({ current: new Float32Array(n) }), [n]);
  const headFlashColor = useMemo(() => ({ current: head.points.map(() => new THREE.Color()) }), [head]);
  const brainFlash = useMemo(() => ({ current: new Float32Array(bn) }), [bn]);
  const brainFlashColor = useMemo(() => ({ current: brain.points.map(() => new THREE.Color()) }), [brain]);
  const pulses = useRef<Pulse[]>(Array.from({ length: PULSE_POOL }, () => ({ active: false, agent: 0, kind: "face" as const, target: 0, progress: 0, speed: 1 })));
  const spawnAcc = useRef(AGENT_ROSTER.map(() => Math.random()));
  const arcPhase = useRef(AGENT_ROSTER.map(() => -1));
  const arcAcc = useRef(0);
  const agentOpen = useRef(AGENT_ROSTER.map(() => 0));
  const agentHover = useRef(AGENT_ROSTER.map(() => 0));
  const anim = useRef({
    introStart: null as number | null,
    introInstant: false,
    lastActiveAt: 0,
    prevMode: mode as SphereMode,
    wake: 0,
    heavyAcc: 0,
    nextBlinkAt: 2.8,
    blinkStart: -10,
    doubleBlink: false,
    eyeOpen: 1,
    gaze: new THREE.Vector2(),
    saccade: new THREE.Vector2(),
    nextSaccadeAt: 1,
    mouth: 0,
    smile: 0.3,
    brow: 0,
    furrow: 0,
    silentSpeakingSince: -1,
    tilt: 0,
    nod: 0,
    brainOpen: 0,
    brainSpin: 0,
  });

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const openedKey = useJarvisStore((s) => s.openedAgentKey);
  const setOpenedAgentKey = useJarvisStore((s) => s.setOpenedAgentKey);
  const brainOpenFlag = useJarvisStore((s) => s.brainOpen);
  const setBrainOpen = useJarvisStore((s) => s.setBrainOpen);
  const activeDirectorId = useJarvisStore((s) => s.activeDirectorId);
  const introNonce = useJarvisStore((s) => s.faceIntroNonce);
  const workflows = useJarvisStore((s) => s.dashboardSnapshot?.n8n.data?.workflows);

  const agentStatus: AgentLiveStatus[] = useMemo(() => AGENT_ROSTER.map((a) => resolveAgentLive(a, workflows).status), [workflows]);

  useEffect(() => {
    anim.current.introInstant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anim.current.introStart = null; // picked up on the next frame
  }, [introNonce]);

  useEffect(
    () => () => {
      document.body.style.cursor = "auto";
    },
    []
  );

  const tmpA = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);
  const base = useMemo(() => new THREE.Color(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const brainMatrix = useMemo(() => new THREE.Matrix4(), []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const a = anim.current;
    const store = useJarvisStore.getState();
    const speechLevel = store.speechLevel;
    const micVolume = store.micVolume;

    // --- Opening / summon -----------------------------------------------------------------
    if (a.introStart === null) {
      a.introStart = a.introInstant ? t - INTRO_DURATION : t;
      a.lastActiveAt = t;
    }
    if (a.prevMode === "idle" && mode === "listening") {
      if (t - a.lastActiveAt > RESUMMON_AFTER_IDLE_S && !a.introInstant) a.introStart = t;
      else a.wake = 1;
    }
    a.prevMode = mode;
    if (mode !== "idle") a.lastActiveAt = t;
    const introT = t - a.introStart;
    const introRunning = introT < INTRO_DURATION;
    const lineAlpha = smoothstep(0.8, 2.2, introT);
    const powerOn = introT > 2.5 && introT < 3.4 ? Math.sin(((introT - 2.5) / 0.9) * Math.PI) : 0;
    a.wake = Math.max(0, a.wake - delta * 1.2);

    // --- Brain open/close -----------------------------------------------------------------
    a.brainOpen = THREE.MathUtils.damp(a.brainOpen, brainOpenFlag ? 1 : 0, 3.2, delta);
    const bo = easeInOut(clamp01(a.brainOpen));
    if (a.brainOpen > 0.02) a.brainSpin += delta * 0.35 * a.brainOpen;
    else a.brainSpin = THREE.MathUtils.damp(a.brainSpin, Math.round(a.brainSpin / (Math.PI * 2)) * Math.PI * 2, 3, delta);
    const brainIntro = a.introInstant ? 1 : easeOutBack(clamp01((introT - 0.9) / 1.0));
    if (brainGroupRef.current) {
      const g = brainGroupRef.current;
      g.position.lerpVectors(BRAIN_CLOSED.pos, BRAIN_OPEN.pos, bo);
      g.scale.setScalar(Math.max(0.001, brainIntro) * THREE.MathUtils.lerp(BRAIN_CLOSED.scale, BRAIN_OPEN.scale, bo));
      // Opens at a three-quarter view (reads as a brain, not two lobes) and keeps turning slowly.
      g.rotation.set(0.14 * bo, a.brainSpin - 0.7 * bo, 0);
      g.updateMatrix();
      brainMatrix.copy(g.matrix);
    }
    const headFade = 1 - 0.8 * bo;
    const brainGlow = 0.5 + 0.75 * bo;

    // --- Blink ----------------------------------------------------------------------------
    if (t > a.nextBlinkAt) {
      a.blinkStart = t;
      a.doubleBlink = Math.random() < 0.2;
      a.nextBlinkAt = t + 2.2 + Math.random() * 4;
    }
    const blinkLen = 0.16;
    const sinceBlink = t - a.blinkStart;
    let blink = 0;
    if (sinceBlink < blinkLen) blink = Math.sin((sinceBlink / blinkLen) * Math.PI);
    else if (a.doubleBlink && sinceBlink > 0.26 && sinceBlink < 0.26 + blinkLen) blink = Math.sin(((sinceBlink - 0.26) / blinkLen) * Math.PI);
    const introEyes = smoothstep(2.35, 2.8, introT);
    a.eyeOpen = introEyes * (1 - blink) * (1 + (mode === "listening" ? 0.18 : 0) + a.wake * 0.2);

    // --- Gaze -----------------------------------------------------------------------------
    if (t > a.nextSaccadeAt) {
      a.saccade.set((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.25);
      a.nextSaccadeAt = t + 0.8 + Math.random() * 2.2;
    }
    let gx: number;
    let gy: number;
    if (bo > 0.5) {
      // Looking at her own brain when it's open in front of her.
      gx = a.saccade.x * 0.3;
      gy = 0.35 + a.saccade.y * 0.2;
    } else if (mode === "thinking" || mode === "analyzing" || mode === "executing") {
      gx = -0.55 + a.saccade.x;
      gy = 0.6 + a.saccade.y;
    } else if (mode === "idle") {
      gx = THREE.MathUtils.clamp(state.pointer.x * 0.9, -1, 1) + a.saccade.x * 0.4;
      gy = THREE.MathUtils.clamp(state.pointer.y * 0.9, -1, 1) + a.saccade.y * 0.4;
    } else {
      gx = a.saccade.x * 0.3;
      gy = a.saccade.y * 0.3;
    }
    a.gaze.x = THREE.MathUtils.damp(a.gaze.x, gx, 10, delta);
    a.gaze.y = THREE.MathUtils.damp(a.gaze.y, gy, 10, delta);

    // --- Mouth: real voice loudness, procedural fallback if no analyser level arrives -------
    let mouthTarget = 0;
    if (mode === "speaking") {
      if (speechLevel > 0.01) {
        a.silentSpeakingSince = -1;
        mouthTarget = clamp01((speechLevel - 0.03) * 3.4);
      } else {
        if (a.silentSpeakingSince < 0) a.silentSpeakingSince = t;
        if (t - a.silentSpeakingSince > 0.25) mouthTarget = Math.max(0, Math.sin(t * 9.5)) * (0.45 + 0.35 * Math.sin(t * 2.3 + 1.1));
      }
    } else {
      a.silentSpeakingSince = -1;
    }
    a.mouth = THREE.MathUtils.damp(a.mouth, mouthTarget, mouthTarget > a.mouth ? 24 : 14, delta);
    const smileTarget = mode === "success" ? 1 : mode === "error" || mode === "warning" ? -0.45 : mode === "listening" ? 0.25 : 0.32;
    a.smile = THREE.MathUtils.damp(a.smile, smileTarget + powerOn * 0.4, 3, delta);
    a.brow = THREE.MathUtils.damp(a.brow, (mode === "listening" ? 1 : 0) + a.wake + (mode === "speaking" ? a.mouth * 0.35 : 0) + bo * 0.5, 6, delta);
    a.furrow = THREE.MathUtils.damp(a.furrow, mode === "thinking" || mode === "analyzing" ? 1 : mode === "error" ? 0.6 : 0, 3, delta);

    // --- Head motion ----------------------------------------------------------------------
    if (headGroupRef.current) {
      a.tilt = THREE.MathUtils.damp(a.tilt, mode === "listening" ? 0.06 : 0, 3, delta);
      a.nod = THREE.MathUtils.damp(a.nod, mode === "speaking" ? a.mouth * 0.05 : mode === "thinking" ? -0.05 : 0, 5, delta);
      headGroupRef.current.rotation.z = a.tilt;
      headGroupRef.current.rotation.x = a.nod + Math.sin(t * 0.7) * 0.01;
      headGroupRef.current.scale.setScalar(HEAD_SCALE * (1 + Math.sin(t * 1.2) * 0.006));
    }

    base.setRGB(baseColor[0], baseColor[1], baseColor[2]);
    const openedIndex = openedKey ? AGENT_ROSTER.findIndex((ag) => ag.key === openedKey) : -1;
    const openedColor = openedIndex >= 0 ? agentColors[openedIndex] : null;
    let openAmountMax = 0;

    // --- Agents (in the brain) --------------------------------------------------------------
    AGENT_ROSTER.forEach((agent, ai) => {
      agentOpen.current[ai] = THREE.MathUtils.damp(agentOpen.current[ai], ai === openedIndex ? 1 : 0, 6, delta);
      agentHover.current[ai] = THREE.MathUtils.damp(agentHover.current[ai], hoveredKey === agent.key ? 1 : 0, 10, delta);
      const open = agentOpen.current[ai];
      openAmountMax = Math.max(openAmountMax, open);
      const ignite = a.introInstant ? 1 : easeOutBack(clamp01((introT - 1.6 - ai * 0.06) / 0.45));
      const status = agentStatus[ai];
      const isCurrent = agent.directorId !== null && agent.directorId === activeDirectorId;
      const dim = openedIndex >= 0 && ai !== openedIndex ? 0.35 : 1;
      const statusGlow = status === "inactive" ? 0.45 : 1;
      const beat = 1 + Math.sin(t * (status === "active" ? 2.6 : 1.2) + ai) * 0.07;
      // Compensates the brain's own scale-up so agents stay pearl-sized when it opens.
      const scale =
        Math.max(0.001, ignite) * beat * THREE.MathUtils.lerp(0.8, 0.62, bo) * (1 + agentHover.current[ai] * 0.35 + open * 0.55 + (isCurrent ? 0.2 : 0));

      const g = agentGroupRefs.current[ai];
      if (g) {
        g.position.copy(agentAnchors[ai]);
        g.scale.setScalar(scale);
      }
      const core = agentCoreRefs.current[ai];
      if (core) {
        const m = core.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = (0.75 + 0.25 * Math.sin(t * 2 + ai) + agentHover.current[ai] * 0.4) * statusGlow * dim;
        m.opacity = dim < 1 ? 0.55 : 1;
      }
      const halo = agentHaloRefs.current[ai];
      if (halo) {
        halo.scale.setScalar(1.05 + 0.12 * Math.sin(t * 2 + ai));
        (halo.material as THREE.MeshBasicMaterial).opacity = (0.18 + open * 0.12) * statusGlow * dim;
      }
      const ring = agentRingRefs.current[ai];
      if (ring) {
        const show = Math.max(open, agentHover.current[ai] * 0.7, isCurrent ? 0.6 : 0);
        ring.visible = show > 0.02;
        ring.scale.setScalar(1 + 0.12 * Math.sin(t * 3));
        ring.rotation.z += delta * 1.5;
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * show;
      }
    });
    const auroraIgnite = a.introInstant ? 1 : easeOutBack(clamp01((introT - 1.3) / 0.5));
    if (auroraCoreRef.current) auroraCoreRef.current.scale.setScalar(Math.max(0.001, auroraIgnite) * (1 + 0.06 * Math.sin(t * 2.2) + powerOn * 0.3));
    if (auroraHaloRef.current) {
      auroraHaloRef.current.scale.setScalar(Math.max(0.001, auroraIgnite) * (1.1 + 0.15 * Math.sin(t * 1.6)));
      (auroraHaloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + powerOn * 0.2 + (mode === "thinking" || mode === "analyzing" ? 0.12 : 0);
    }

    // Heavy per-point/per-link rebuild (~25k points + ~14k links) runs at ~30Hz instead of every
    // frame: the camera/orbit still renders at full refresh rate, only the face deformation and
    // shimmer are sampled at 30Hz (imperceptible), which halves the CPU cost. During the intro
    // swirl it runs every frame so the opening animation stays smooth.
    const hp = buffers.headPos;
    a.heavyAcc += delta;
    const runHeavy = introRunning || a.heavyAcc >= HEAVY_INTERVAL_S;
    const heavyDelta = a.heavyAcc;
    if (runHeavy) {
    a.heavyAcc = 0;
      // --- Head points (face deformations + shading) ------------------------------------------
      const hc = buffers.headCol;
      const listening = mode === "listening";
      const modeBoost = mode === "thinking" || mode === "analyzing" ? 1.15 : 1;
      for (let i = 0; i < n; i++) {
        const pt = head.points[i];
        let x = pt.x;
        let y = pt.y;
        let z = pt.z;
        let b = REGION_BRIGHTNESS[pt.region];

        switch (pt.region) {
          case "eye": {
            const cy = pt.side !== 0 ? head.eyes[pt.side].y - 0.004 : y;
            if (pt.u > 0) y = cy + (y - cy) * a.eyeOpen;
            else if (pt.u < 0) y = cy + (y - cy) * (0.6 + 0.4 * Math.min(1, a.eyeOpen));
            break;
          }
          case "iris":
          case "pupil": {
            const open = Math.min(1, a.eyeOpen);
            const cy = pt.side !== 0 ? head.eyes[pt.side].y : y;
            x += a.gaze.x * 0.028;
            y = cy + (y - cy) * open + a.gaze.y * 0.016 * open;
            b *= smoothstep(0.2, 0.6, a.eyeOpen);
            break;
          }
          case "brow": {
            const inner = 1 - pt.u;
            y += a.brow * 0.03 - a.furrow * 0.02 * inner + a.furrow * 0.006 * pt.u;
            x -= pt.side * a.furrow * 0.012 * inner;
            break;
          }
          case "lipUpper":
          case "lipLower": {
            const w = 1 - pt.u * pt.u;
            x *= 1 - a.mouth * 0.08;
            if (pt.region === "lipUpper") y += a.mouth * 0.015 * w;
            else y -= a.mouth * 0.075 * Math.pow(w, 0.7);
            y += a.smile * 0.022 * pt.u * pt.u - a.smile * 0.004 * w;
            b *= 1 + a.mouth * 0.5;
            break;
          }
          case "grid":
          case "nose": {
            if (y < MOUTH_Y - 0.01 && y > -1.0 && pt.region !== "nose") {
              const jaw = clamp01((MOUTH_Y - y) / 0.33) * (1 - clamp01((Math.abs(x) - 0.18) / 0.35));
              y -= a.mouth * 0.06 * jaw;
            }
            const dxc = Math.abs(x) - head.mouth.halfWidth - 0.04;
            const dyc = y - (MOUTH_Y + 0.07);
            y += a.smile * 0.018 * Math.exp(-(dxc * dxc + dyc * dyc) / 0.008);
            break;
          }
          default:
            break;
        }

        if (pt.region === "hair") {
          // Gentle sway, stronger toward the tips.
          const sway = Math.sin(t * 0.9 + pt.seed * 6.28 + pt.u * 2.5) * 0.028 * Math.pow(pt.u, 1.5);
          x += pt.side * sway;
          z += Math.cos(t * 0.7 + pt.seed * 4) * 0.02 * Math.pow(pt.u, 1.5);
          // Light pulses running down each strand.
          b *= 0.55 + 0.45 * (1 - pt.u) + 1.1 * Math.max(0, Math.sin(t * 1.6 - pt.u * 9 + pt.seed * 12) - 0.85) * 6;
        } else if (listening && micVolume > 0.02) {
          const r = Math.sqrt(x * x + y * y);
          z += micVolume * 0.05 * Math.sin(r * 18 - t * 9);
        }

        if (introRunning) {
          const [d0, dr] = REGION_INTRO_DELAY[pt.region] ?? [0.5, 0.8];
          const prog = easeOutCubic(clamp01((introT - (d0 + pt.seed * dr)) / 1.1));
          const swirl = (1 - prog) * 1.4;
          const sx = scatter[i * 3];
          const sz = scatter[i * 3 + 2];
          const rx = sx * Math.cos(swirl) - sz * Math.sin(swirl);
          const rz = sx * Math.sin(swirl) + sz * Math.cos(swirl);
          x = rx + (x - rx) * prog;
          y = scatter[i * 3 + 1] + (y - scatter[i * 3 + 1]) * prog;
          z = rz + (z - rz) * prog;
          b *= 0.25 + 0.75 * prog;
        }

        hp[i * 3] = x;
        hp[i * 3 + 1] = y;
        hp[i * 3 + 2] = z;

        if (pt.region !== "halo" && pt.region !== "hair") b *= 0.4 + 0.8 * pt.facing;
        const twinkle = pt.region === "halo" ? 0.7 + 0.3 * Math.sin(t * (1.2 + pt.seed * 2.5) + pt.seed * 40) : 0.88 + 0.12 * Math.sin(t * 1.7 + pt.seed * 20);
        const k = (b * twinkle * modeBoost + powerOn * 0.5 + a.wake * 0.35) * headFade;

        switch (pt.region) {
          case "grid":
            col.copy(base).lerp(headTint[i], 0.16).lerp(WHITE, 0.2);
            break;
          case "outline":
            col.copy(base).lerp(headTint[i], 0.12).lerp(WHITE, 0.1);
            break;
          case "halo":
            col.copy(base).lerp(headTint[i], 0.8);
            break;
          case "hair":
            col.copy(HAIR_A).lerp(HAIR_B, pt.seed * 0.7 + pt.u * 0.3);
            break;
          case "pupil":
            col.copy(base).lerp(WHITE, 0.65);
            break;
          default:
            col.copy(base).lerp(WHITE, 0.35);
        }
        // Duotone: warm on her left, cool on her right (viewer's right), blended across the midline.
        const duo = smoothstep(-0.08, 0.32, x);
        if (pt.region === "hair") col.lerp(HAIR_BLUE, duo * 0.9);
        else {
          const eyeLike = pt.region === "eye" || pt.region === "iris" || pt.region === "pupil";
          col.lerp(WARM, (1 - duo) * (eyeLike ? 0.1 : 0.45));
          col.lerp(BLUE, duo * (eyeLike ? 0.25 : 0.9));
        }
        if (openedColor) col.lerp(openedColor, openAmountMax * 0.35);
        const f = headFlash.current[i];
        headFlash.current[i] = Math.max(0, f - heavyDelta * 2.2);
        const fc = headFlashColor.current[i];
        hc[i * 3] = col.r * k + fc.r * f;
        hc[i * 3 + 1] = col.g * k + fc.g * f;
        hc[i * 3 + 2] = col.b * k + fc.b * f;
      }
      headGroups.forEach((g) => {
        g.idx.forEach((i, k) => {
          g.pos[k * 3] = hp[i * 3];
          g.pos[k * 3 + 1] = hp[i * 3 + 1];
          g.pos[k * 3 + 2] = hp[i * 3 + 2];
          g.col[k * 3] = hc[i * 3];
          g.col[k * 3 + 1] = hc[i * 3 + 1];
          g.col[k * 3 + 2] = hc[i * 3 + 2];
        });
      });
      head.links.forEach(([ia, ib], li) => {
        const o = li * 6;
        const kind = head.linkKinds[li];
        const alpha = lineAlpha * (kind === "feature" ? 0.9 : kind === "grid" ? 0.5 : kind === "hair" ? 0.2 : 0.3);
        buffers.headLinePos[o] = hp[ia * 3];
        buffers.headLinePos[o + 1] = hp[ia * 3 + 1];
        buffers.headLinePos[o + 2] = hp[ia * 3 + 2];
        buffers.headLinePos[o + 3] = hp[ib * 3];
        buffers.headLinePos[o + 4] = hp[ib * 3 + 1];
        buffers.headLinePos[o + 5] = hp[ib * 3 + 2];
        buffers.headLineCol[o] = hc[ia * 3] * alpha;
        buffers.headLineCol[o + 1] = hc[ia * 3 + 1] * alpha;
        buffers.headLineCol[o + 2] = hc[ia * 3 + 2] * alpha;
        buffers.headLineCol[o + 3] = hc[ib * 3] * alpha;
        buffers.headLineCol[o + 4] = hc[ib * 3 + 1] * alpha;
        buffers.headLineCol[o + 5] = hc[ib * 3 + 2] * alpha;
      });

      // --- Brain colors: each lobe in its agent's color ---------------------------------------
      const bc = buffers.brainCol;
      const brainAlpha = smoothstep(0.9, 2.0, introT);
      for (let i = 0; i < bn; i++) {
        const pt = brain.points[i];
        const tw = 0.75 + 0.25 * Math.sin(t * (1.1 + pt.seed * 2) + pt.seed * 30);
        let k = (pt.region === "cortex" ? 0.9 : 1.25) * tw * brainGlow * brainAlpha;
        col.copy(brainTint[i]).lerp(base, pt.region === "stem" ? 0.6 : 0.15);
        if (openedIndex >= 0) {
          const d = agentAnchors[openedIndex].distanceTo(tmpA.set(pt.x, pt.y, pt.z));
          k *= d < 0.22 ? 1.4 : 0.55;
        }
        const f = brainFlash.current[i];
        brainFlash.current[i] = Math.max(0, f - heavyDelta * 2.4);
        const fc = brainFlashColor.current[i];
        bc[i * 3] = col.r * k + fc.r * f;
        bc[i * 3 + 1] = col.g * k + fc.g * f;
        bc[i * 3 + 2] = col.b * k + fc.b * f;
      }
      brainGroups.forEach((g) => {
        g.idx.forEach((i, k) => {
          g.col[k * 3] = bc[i * 3];
          g.col[k * 3 + 1] = bc[i * 3 + 1];
          g.col[k * 3 + 2] = bc[i * 3 + 2];
        });
      });
      brain.links.forEach(([ia, ib], li) => {
        const o = li * 6;
        const alpha = brain.points[ia].region === "sulcus" ? 1.0 : brain.points[ia].region === "cortex" ? 0.55 : 0.7;
        buffers.brainLineCol[o] = bc[ia * 3] * alpha;
        buffers.brainLineCol[o + 1] = bc[ia * 3 + 1] * alpha;
        buffers.brainLineCol[o + 2] = bc[ia * 3 + 2] * alpha;
        buffers.brainLineCol[o + 3] = bc[ib * 3] * alpha;
        buffers.brainLineCol[o + 4] = bc[ib * 3 + 1] * alpha;
        buffers.brainLineCol[o + 5] = bc[ib * 3 + 2] * alpha;
      });
    }

    // --- Arcs AURORA → agents, with a delegation pulse running along them --------------------
    const thinking = mode === "thinking" || mode === "analyzing" || mode === "executing";
    arcAcc.current += delta * (thinking ? 3 : 0.6 + bo * 1.2) * (introRunning ? 0 : 1);
    while (arcAcc.current >= 1) {
      arcAcc.current -= 1;
      const pick = openedIndex >= 0 ? openedIndex : Math.floor(Math.random() * AGENT_ROSTER.length);
      if (arcPhase.current[pick] < 0) arcPhase.current[pick] = 0;
    }
    const arcAlpha = smoothstep(1.7, 2.6, introT) * (0.45 + 0.55 * bo);
    AGENT_ROSTER.forEach((_, ai) => {
      const phase = arcPhase.current[ai];
      if (phase >= 0) {
        arcPhase.current[ai] = phase + delta * 1.4;
        if (arcPhase.current[ai] > 1.25) arcPhase.current[ai] = -1;
      }
      const c = agentColors[ai];
      const dim = openedIndex >= 0 && ai !== openedIndex ? 0.3 : 1;
      const baseA = arcAlpha * 0.25 * dim + (ai === openedIndex ? agentOpen.current[ai] * 0.4 : 0);
      for (let s = 0; s < ARC_SEGMENTS; s++) {
        const o = (ai * ARC_SEGMENTS + s) * 6;
        for (const [end, u] of [[0, s / ARC_SEGMENTS], [3, (s + 1) / ARC_SEGMENTS]] as const) {
          const headPos = arcPhase.current[ai];
          const glow = headPos >= 0 ? Math.exp(-(((u - headPos) / 0.09) ** 2)) * 1.6 * arcAlpha : 0;
          const w = 0.55 * (1 - u);
          buffers.arcCol[o + end] = (c.r * (1 - w) + w) * (baseA + glow);
          buffers.arcCol[o + end + 1] = (c.g * (1 - w) + w) * (baseA + glow);
          buffers.arcCol[o + end + 2] = (c.b * (1 - w) + w) * (baseA + glow);
        }
      }
    });

    // --- Pulses: out of the brain across her face (closed), or inside the brain (open) --------
    const modeRate = thinking ? 3 : mode === "speaking" ? 1.6 : mode === "listening" ? 1.2 : 1;
    if (!introRunning || introT > 2.0) {
      AGENT_ROSTER.forEach((_, ai) => {
        const status = agentStatus[ai];
        let rate = status === "active" ? 0.9 : status === "inactive" ? 0.12 : 0.5;
        rate *= modeRate * (lowPower ? 0.5 : 1);
        if (openedIndex >= 0) rate *= ai === openedIndex ? 5 : 0.25;
        spawnAcc.current[ai] += rate * delta;
        while (spawnAcc.current[ai] >= 1) {
          spawnAcc.current[ai] -= 1;
          const slot = pulses.current.find((pl) => !pl.active);
          if (!slot) break;
          const inBrain = bo > 0.5;
          const pool = inBrain ? cortexTargets : faceTargets;
          slot.active = true;
          slot.agent = ai;
          slot.kind = inBrain ? "brain" : "face";
          slot.target = pool[Math.floor(Math.random() * pool.length)];
          slot.progress = 0;
          slot.speed = inBrain ? 1.1 + Math.random() * 0.6 : 0.6 + Math.random() * 0.5;
        }
      });
    }
    pulses.current.forEach((pl, k) => {
      const o = k * 3;
      const limit = pl.kind === "face" ? n : bn;
      if (!pl.active || pl.target >= limit) {
        pl.active = false;
        buffers.pulsePos[o] = 0;
        buffers.pulsePos[o + 1] = 0;
        buffers.pulsePos[o + 2] = -50;
        buffers.pulseCol[o] = buffers.pulseCol[o + 1] = buffers.pulseCol[o + 2] = 0;
        return;
      }
      pl.progress += pl.speed * delta;
      if (pl.progress >= 1) {
        pl.active = false;
        if (pl.kind === "face") {
          headFlash.current[pl.target] = 1;
          headFlashColor.current[pl.target].copy(agentColors[pl.agent]).multiplyScalar(1.5);
        } else {
          brainFlash.current[pl.target] = 1;
          brainFlashColor.current[pl.target].copy(agentColors[pl.agent]).multiplyScalar(1.5);
        }
        return;
      }
      // Pulses live in head space; the agent (and brain targets) are mapped through the brain's transform.
      tmpA.copy(agentAnchors[pl.agent]).applyMatrix4(brainMatrix);
      if (pl.kind === "face") tmpB.set(hp[pl.target * 3], hp[pl.target * 3 + 1], hp[pl.target * 3 + 2]);
      else tmpB.set(brain.points[pl.target].x, brain.points[pl.target].y, brain.points[pl.target].z).applyMatrix4(brainMatrix);
      const e = easeOutCubic(pl.progress);
      tmpA.lerp(tmpB, e);
      tmpA.z += Math.sin(Math.PI * e) * 0.04;
      buffers.pulsePos[o] = tmpA.x;
      buffers.pulsePos[o + 1] = tmpA.y;
      buffers.pulsePos[o + 2] = tmpA.z;
      const c = agentColors[pl.agent];
      const fade = Math.sin(Math.PI * Math.min(1, pl.progress * 1.15)) * 1.8;
      buffers.pulseCol[o] = c.r * fade;
      buffers.pulseCol[o + 1] = c.g * fade;
      buffers.pulseCol[o + 2] = c.b * fade;
    });

    const dirty = [arcGeomRef.current, pulseGeomRef.current];
    if (runHeavy) dirty.push(...headGeomRefs.current, ...brainGeomRefs.current, headLineGeomRef.current, brainLineGeomRef.current);
    for (const geom of dirty) {
      if (!geom) continue;
      (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geom.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  const onAgentOver = (key: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredKey(key);
    document.body.style.cursor = "pointer";
  };
  const onPointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredKey(null);
    document.body.style.cursor = "auto";
  };
  const onAgentClick = (key: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOpenedAgentKey(openedKey === key ? null : key);
  };
  const onAuroraClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setBrainOpen(!brainOpenFlag);
  };

  const pointsMaterialProps = {
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    toneMapped: false,
    map: dotTexture,
    alphaTest: 0.01,
  } as const;
  const lineMaterial = <lineBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />;
  const showLabels = brainOpenFlag;

  return (
    <group ref={headGroupRef} scale={HEAD_SCALE} position={[0, HEAD_OFFSET_Y, 0]}>
      {/* The head: real face, skull to the nape, ears, neck, halo */}
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={headLineGeomRef}>
          {attr(buffers.headLinePos, "position", buffers.headLinePos.length / 3)}
          {attr(buffers.headLineCol, "color", buffers.headLineCol.length / 3)}
        </bufferGeometry>
        {lineMaterial}
      </lineSegments>
      {headGroups.map((g, gi) => (
        <points key={g.key} frustumCulled={false}>
          <bufferGeometry ref={(el) => (headGeomRefs.current[gi] = el)}>
            {attr(g.pos, "position", g.idx.length)}
            {attr(g.col, "color", g.idx.length)}
          </bufferGeometry>
          <pointsMaterial size={g.size} {...pointsMaterialProps} />
        </points>
      ))}

      <points frustumCulled={false}>
        <bufferGeometry ref={pulseGeomRef}>
          {attr(buffers.pulsePos, "position", PULSE_POOL)}
          {attr(buffers.pulseCol, "color", PULSE_POOL)}
        </bufferGeometry>
        <pointsMaterial size={0.065} {...pointsMaterialProps} />
      </points>

      {/* The brain, with every agent in its own lobe. matrixAutoUpdate off: the frame loop owns it. */}
      <group ref={brainGroupRef} position={BRAIN_CLOSED.pos} matrixAutoUpdate={false}>
        <lineSegments frustumCulled={false}>
          <bufferGeometry ref={brainLineGeomRef}>
            {attr(buffers.brainLinePos, "position", buffers.brainLinePos.length / 3)}
            {attr(buffers.brainLineCol, "color", buffers.brainLineCol.length / 3)}
          </bufferGeometry>
          {lineMaterial}
        </lineSegments>
        {brainGroups.map((g, gi) => (
          <points key={g.key} frustumCulled={false}>
            <bufferGeometry ref={(el) => (brainGeomRefs.current[gi] = el)}>
              {attr(g.pos, "position", g.idx.length)}
              {attr(g.col, "color", g.idx.length)}
            </bufferGeometry>
            <pointsMaterial size={g.size} {...pointsMaterialProps} />
          </points>
        ))}
        <lineSegments frustumCulled={false}>
          <bufferGeometry ref={arcGeomRef}>
            {attr(buffers.arcPos, "position", buffers.arcPos.length / 3)}
            {attr(buffers.arcCol, "color", buffers.arcCol.length / 3)}
          </bufferGeometry>
          {lineMaterial}
        </lineSegments>

        {/* AURORA core (thalamus). Tap: open / close the brain. */}
        <group position={coreLocal}>
          <mesh ref={auroraCoreRef}>
            <sphereGeometry args={[0.045, 32, 32]} />
            <meshStandardMaterial color="#fff6ec" emissive="#ffe3c8" emissiveIntensity={0.9} roughness={0.18} metalness={0.15} toneMapped={false} />
          </mesh>
          <mesh ref={auroraHaloRef}>
            <sphereGeometry args={[0.09, 24, 24]} />
            <meshBasicMaterial color="#ffd9b0" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <mesh
            onClick={onAuroraClick}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={onPointerOut}
          >
            <sphereGeometry args={[0.085, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <Suspense fallback={null}>
            <Billboard position={[0, -0.1, 0.02]}>
              <Text fontSize={0.036} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#000000" letterSpacing={0.08}>
                AURORA
              </Text>
            </Billboard>
          </Suspense>
        </group>

        {AGENT_ROSTER.map((agent, ai) => {
          const opened = openedKey === agent.key;
          const labelVisible = showLabels || opened || hoveredKey === agent.key;
          return (
            <group key={agent.key} ref={(el) => (agentGroupRefs.current[ai] = el)} position={agentAnchors[ai]}>
              <mesh ref={(el) => (agentCoreRefs.current[ai] = el)}>
                <sphereGeometry args={[0.03, 32, 32]} />
                <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.8} roughness={0.22} metalness={0.2} transparent toneMapped={false} />
              </mesh>
              <mesh ref={(el) => (agentHaloRefs.current[ai] = el)}>
                <sphereGeometry args={[0.05, 20, 20]} />
                <meshBasicMaterial color={agent.color} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
              </mesh>
              <mesh ref={(el) => (agentRingRefs.current[ai] = el)} visible={false}>
                <torusGeometry args={[0.07, 0.005, 8, 48]} />
                <meshBasicMaterial color={agent.color} transparent opacity={0} depthWrite={false} toneMapped={false} />
              </mesh>
              <mesh onPointerOver={onAgentOver(agent.key)} onPointerOut={onPointerOut} onClick={onAgentClick(agent.key)}>
                <sphereGeometry args={[0.07, 12, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              {labelVisible && (
                // Own boundary: drei <Text> suspends while its font loads; the scene-wide one
                // would otherwise hide the whole head for that moment.
                <Suspense fallback={null}>
                  <Billboard position={[0, -0.075, 0.02]}>
                    <Text
                      fontSize={opened ? 0.03 : 0.024}
                      color={opened || hoveredKey === agent.key ? agent.color : "#e6ecf5"}
                      anchorX="center"
                      anchorY="middle"
                      outlineWidth={0.004}
                      outlineColor="#000000"
                    >
                      {agent.short}
                    </Text>
                  </Billboard>
                </Suspense>
              )}
            </group>
          );
        })}
      </group>
    </group>
  );
}
