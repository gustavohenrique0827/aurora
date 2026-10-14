import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSphereReactivity } from "../../hooks/useSphereReactivity";
import { sphereFragmentShader, sphereVertexShader } from "./sphereShaders";
import { SynapseNetwork } from "./SynapseNetwork";
import type { SynapseFocus } from "./AgentConstellation";
import { fibonacciSpherePoints } from "./sphereMath";
import { SynapseFace } from "./aurora/SynapseFace";
import { useJarvisStore } from "../../state/store";
import type { HandFrame, HandSide } from "../../lib/handTracking/types";

interface SphereSceneProps {
  lowPower: boolean;
  /** True while OrbitControls (EnergySphere.tsx) is being dragged/zoomed — freezes the
   * cursor-follow tilt below so the two rotation sources don't fight for the same frame. */
  interacting: boolean;
}

interface TwoHandState {
  baseDist: number;
  baseAngle: number;
  baseScale: number;
  baseRotZ: number;
}

// Momentum/friction constants (Seção 9) — a pinch "throw" keeps spinning the orb briefly
// instead of stopping dead the instant fingers release, then decays and snaps to a full
// stop rather than drifting asymptotically forever.
const MOMENTUM_FRICTION = 3.5; // exponential decay rate (higher = stops sooner)
const MOMENTUM_SNAP_EPSILON = 0.02; // rad/s — below this, momentum is just called "stopped"

// Agarrar sinapse (Seção "abrir sinapse") — a pinch that lands within this world-space
// distance of a synapse node's real (rotating) position opens it instead of grabbing the
// orb. Well under the ~0.33 average spacing between neighboring nodes on the inner shell
// (110 nodes on a radius-0.96 sphere), so it reliably targets one node at a time.
const SYNAPSE_GRAB_THRESHOLD = 0.12;

export function SphereScene({ lowPower, interacting }: SphereSceneProps) {
  const { mode, micVolume, baseColor, pulseSpeed } = useSphereReactivity();
  const { camera, raycaster } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const interactionRef = useRef<THREE.Group>(null);
  // Pinch-to-grab state (Seções 7/51) — a ref, not state, so a grab in progress doesn't
  // trigger a React re-render every frame; only the orb's rotation/scale changes.
  const grabRef = useRef<{ hand: HandSide | null; baseX: number; baseY: number; baseRotX: number; baseRotY: number }>(
    { hand: null, baseX: 0, baseY: 0, baseRotX: 0, baseRotY: 0 }
  );
  const grabAmountRef = useRef(0);
  // Angular velocity (rad/s) imparted by the last pinch-drag — applied after release,
  // decaying via friction (Seção 9).
  const momentumRef = useRef({ vx: 0, vy: 0 });
  // Two-hand pinch scale/twist (Seção 10/18) — both hands pinching at once takes over
  // from single-hand grab; distance between the two pinch points drives scale, the angle
  // between them drives a roll (rotation.z).
  const twoHandRef = useRef<TwoHandState | null>(null);
  const scaleRef = useRef(1);
  // Agarrar sinapse — mirrors grabRef/grabAmountRef above but for the inner SynapseNetwork
  // shell's individual nodes instead of the whole orb. synapseGroupRef reaches the shell's
  // rotating group so its matrixWorld can be read once at grab-start (hit-test only —
  // never written to). synapseFocusRef is what AgentConstellation reads every frame to
  // damp its nodes toward the grabbed node's direction; see SynapseFocus in that file.
  const synapseGroupRef = useRef<THREE.Group>(null);
  const synapseGrabRef = useRef<{ hand: HandSide | null; index: number | null }>({ hand: null, index: null });
  const synapseGrabAmountRef = useRef(0);
  const synapseFocusRef = useRef<SynapseFocus>({ direction: new THREE.Vector3(0, 0, 1), amount: 0 });
  const innerSynapseNodeCount = lowPower ? 60 : 110;
  const synapseNodePositions = useMemo(
    () => fibonacciSpherePoints(innerSynapseNodeCount),
    [innerSynapseNodeCount]
  );
  // Dedupe air-gesture CLICK events by the HandFrame's own timestamp — the tracking loop
  // and this r3f useFrame run on separate rAF registrations, so a single CLICK could
  // otherwise be read (and acted on) more than once before the next hand frame arrives.
  const lastClickTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });
  const lastHoldStartTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulseSpeed: { value: pulseSpeed },
      uMicVolume: { value: micVolume },
      uIntensity: { value: mode === "thinking" ? 1.6 : mode === "speaking" ? 1.2 : 0.8 },
      uColor: { value: new THREE.Color(...baseColor) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state, delta) => {
    if (materialRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime;
      uniforms.uPulseSpeed.value = THREE.MathUtils.lerp(uniforms.uPulseSpeed.value, pulseSpeed, delta * 2);
      uniforms.uMicVolume.value = THREE.MathUtils.lerp(uniforms.uMicVolume.value, micVolume, delta * 6);
      uniforms.uIntensity.value = THREE.MathUtils.lerp(
        uniforms.uIntensity.value,
        mode === "thinking" ? 1.6 : mode === "speaking" ? 1.2 : mode === "error" ? 1.0 : 0.8,
        delta * 3
      );
      uniforms.uColor.value.setRGB(...baseColor);
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }

    // Vision-driven orb interaction (Lote 1 + Lote 2 + Lote 3) — reads the store directly
    // instead of a selector so a hand frame arriving (up to ~30/sec) never re-renders this
    // component, matching the imperative-read pattern already used in GestureDebugPanel.
    const vision = useJarvisStore.getState();
    const grab = grabRef.current;
    const visionLive = vision.cameraActive && !vision.privacyMode;

    // Two-hand pinch scale/twist (Seção 10/18) — checked first: both hands pinching at
    // once always wins over a single-hand grab, since it can only start when TWO hands
    // are already qualified, a strictly narrower condition.
    // A hand currently driving an open radial menu is excluded here — otherwise moving
    // that hand to pick a menu item would simultaneously grab/rotate the orb underneath
    // it, since both would react to the same continuous held pinch.
    const menuHand = vision.radialMenuOpen ? vision.radialMenuHand : null;
    const qualifiedPinchHands = visionLive
      ? (["right", "left"] as HandSide[])
          .map((side) => vision.hands[side])
          .filter(
            (h): h is HandFrame =>
              !!h && h.pinch.active && h.pose.confidence >= vision.confidenceThreshold && h.side !== menuHand
          )
      : [];

    if (qualifiedPinchHands.length === 2 && interactionRef.current) {
      const [a, b] = qualifiedPinchHands;
      const dx = a.pinch.position.x - b.pinch.position.x;
      const dy = a.pinch.position.y - b.pinch.position.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const angle = Math.atan2(dy, dx);

      if (!twoHandRef.current) {
        // Starting fresh — release any single-hand grab/momentum so they don't fight.
        grab.hand = null;
        momentumRef.current.vx = 0;
        momentumRef.current.vy = 0;
        twoHandRef.current = {
          baseDist: dist,
          baseAngle: angle,
          baseScale: scaleRef.current,
          baseRotZ: interactionRef.current.rotation.z,
        };
      } else {
        const two = twoHandRef.current;
        const scale = THREE.MathUtils.clamp(two.baseScale * (dist / two.baseDist), 0.5, 2.2);
        scaleRef.current = scale;
        interactionRef.current.scale.setScalar(scale);
        interactionRef.current.rotation.z = two.baseRotZ + (angle - two.baseAngle);
      }
    } else if (twoHandRef.current) {
      // One hand released — hand control back to single-hand grab / idle systems. The
      // scale/roll reached stay put (pinch-zoom convention), no snap-back to 1x.
      twoHandRef.current = null;
    }

    // Single-hand pinch-to-grab (Seções 7/51) — only runs when two-hand mode isn't active.
    if (visionLive && !twoHandRef.current) {
      const activeHand =
        (grab.hand && qualifiedPinchHands.find((h) => h.side === grab.hand)) ||
        (qualifiedPinchHands.find((h) => h.side === vision.dominantHand) ?? qualifiedPinchHands[0]);

      if (activeHand) {
        // Selfie feed is mirrored, matching the handedness mapping in useHandTrackingEngine.ts.
        const ndcX = (1 - activeHand.pinch.position.x) * 2 - 1;
        const ndcY = -(activeHand.pinch.position.y * 2 - 1);

        if (grab.hand === null && synapseGrabRef.current.hand === null) {
          // Nothing grabbed yet — hit-test the inner SynapseNetwork's nodes FIRST (Seção
          // agarrar-sinapse), and only fall back to the normal orb-grab when the pinch
          // didn't land near one. Reuses the orb raycast's own surface hit point as the
          // search origin so this only ever considers near-side (visible) nodes.
          raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
          const hit = meshRef.current ? raycaster.intersectObject(meshRef.current, false) : [];
          if (hit.length > 0 && interactionRef.current) {
            let nearestIndex: number | null = null;
            let nearestDist = SYNAPSE_GRAB_THRESHOLD;
            if (synapseGroupRef.current) {
              synapseGroupRef.current.updateWorldMatrix(true, false);
              const matrixWorld = synapseGroupRef.current.matrixWorld;
              const surfacePoint = hit[0].point;
              synapseNodePositions.forEach((p, i) => {
                const worldPos = p.clone().applyMatrix4(matrixWorld);
                const d = worldPos.distanceTo(surfacePoint);
                if (d < nearestDist) {
                  nearestDist = d;
                  nearestIndex = i;
                }
              });
            }
            if (nearestIndex !== null) {
              synapseGrabRef.current = { hand: activeHand.side, index: nearestIndex };
            } else {
              grab.hand = activeHand.side;
              grab.baseX = ndcX;
              grab.baseY = ndcY;
              grab.baseRotX = interactionRef.current.rotation.x;
              grab.baseRotY = interactionRef.current.rotation.y;
              momentumRef.current.vx = 0;
              momentumRef.current.vy = 0;
            }
          }
        } else if (grab.hand === activeHand.side && interactionRef.current) {
          // Grab move — orb rotation follows the hand's displacement from grab start.
          // Also derives an instantaneous angular velocity, smoothed, so a "throw" on
          // release (below) reflects how fast the hand was moving, not just its last frame.
          const newRotY = grab.baseRotY + (ndcX - grab.baseX) * 2.2;
          const newRotX = grab.baseRotX - (ndcY - grab.baseY) * 2.2;
          if (delta > 0) {
            const instVY = (newRotY - interactionRef.current.rotation.y) / delta;
            const instVX = (newRotX - interactionRef.current.rotation.x) / delta;
            momentumRef.current.vy = THREE.MathUtils.lerp(momentumRef.current.vy, instVY, 0.4);
            momentumRef.current.vx = THREE.MathUtils.lerp(momentumRef.current.vx, instVX, 0.4);
          }
          interactionRef.current.rotation.y = newRotY;
          interactionRef.current.rotation.x = newRotX;
        }
        // else: synapseGrabRef.current.hand === activeHand.side — a synapse is already
        // open and held. Nothing to update per-frame here; the marker/agent-cluster
        // reaction below reads synapseGrabAmountRef/synapseFocusRef directly, and the
        // synapse itself doesn't need to track hand displacement the way orb-rotation does.
      } else {
        // Pinch released (or the grabbing hand was lost) — momentum (below) takes over
        // for an orb-grab; a synapse just closes.
        if (grab.hand !== null) grab.hand = null;
        if (synapseGrabRef.current.hand !== null) synapseGrabRef.current = { hand: null, index: null };
      }
    } else {
      if (grab.hand !== null) grab.hand = null;
      if (synapseGrabRef.current.hand !== null) synapseGrabRef.current = { hand: null, index: null };
    }

    // Air-gesture CLICK on the orb opens/closes the comms dock (Seção 12/13) — the orb is
    // Aurora's visual anchor, so a quick tap-pinch on it toggles the real chat surface
    // behind it rather than a placeholder UI that doesn't do anything yet. A CLICK only
    // fires (see airGestures.ts) for a pinch that released quickly WITHOUT crossing the
    // drag deadzone, so this can't misfire during an actual grab-and-rotate.
    if (visionLive) {
      for (const side of ["right", "left"] as HandSide[]) {
        const hand = vision.hands[side];
        if (
          hand?.gestureEvent?.type === "CLICK" &&
          hand.timestamp !== lastClickTsRef.current[side] &&
          hand.pose.confidence >= vision.confidenceThreshold
        ) {
          lastClickTsRef.current[side] = hand.timestamp;
          const ndcX = (1 - hand.pinch.position.x) * 2 - 1;
          const ndcY = -(hand.pinch.position.y * 2 - 1);
          raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
          const hit = meshRef.current ? raycaster.intersectObject(meshRef.current, false) : [];
          if (hit.length > 0) {
            useJarvisStore.getState().toggleCommsDock();
          }
        }
      }
    }

    // Holding a pinch on the orb opens the radial menu (Seção 33) — a longer, deliberate
    // gesture than the tap-CLICK above, so the two can't be confused with each other.
    // RadialMenu.tsx owns everything from here (direction tracking, selection, and the
    // confirmation gate for its one sensitive item, Seção 48).
    if (visionLive) {
      for (const side of ["right", "left"] as HandSide[]) {
        const hand = vision.hands[side];
        if (
          hand?.gestureEvent?.type === "HOLD_START" &&
          hand.timestamp !== lastHoldStartTsRef.current[side] &&
          hand.pose.confidence >= vision.confidenceThreshold
        ) {
          lastHoldStartTsRef.current[side] = hand.timestamp;
          const ndcX = (1 - hand.pinch.position.x) * 2 - 1;
          const ndcY = -(hand.pinch.position.y * 2 - 1);
          raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
          const hit = meshRef.current ? raycaster.intersectObject(meshRef.current, false) : [];
          if (hit.length > 0 && interactionRef.current) {
            const worldCenter = new THREE.Vector3();
            interactionRef.current.getWorldPosition(worldCenter);
            const projected = worldCenter.clone().project(camera);
            useJarvisStore.getState().setRadialMenuCenter({
              x: (projected.x * 0.5 + 0.5) * window.innerWidth,
              y: (1 - (projected.y * 0.5 + 0.5)) * window.innerHeight,
            });
            useJarvisStore.getState().setRadialMenuHand(side);
            useJarvisStore.getState().setRadialMenuOpen(true);
            grab.hand = null; // release any grab this same still-held pinch had already started
          }
        }
      }
    }

    // Momentum + friction (Seção 9) — after a pinch "throw," the orb keeps spinning at
    // the velocity captured above and decays via friction instead of stopping dead the
    // instant fingers release; once it decays past a small threshold it snaps to a full
    // stop rather than drifting asymptotically forever.
    const momentum = momentumRef.current;
    const momentumActive = Math.hypot(momentum.vx, momentum.vy) > MOMENTUM_SNAP_EPSILON;
    if (grab.hand === null && !twoHandRef.current) {
      if (momentumActive && interactionRef.current) {
        interactionRef.current.rotation.y += momentum.vy * delta;
        interactionRef.current.rotation.x += momentum.vx * delta;
        const decay = Math.exp(-MOMENTUM_FRICTION * delta);
        momentum.vx *= decay;
        momentum.vy *= decay;
      } else {
        momentum.vx = 0;
        momentum.vy = 0;
      }
    }

    const pinchInteracting = grab.hand !== null || twoHandRef.current !== null;
    grabAmountRef.current = THREE.MathUtils.damp(grabAmountRef.current, pinchInteracting ? 1 : 0, 6, delta);

    // Agarrar sinapse — damp the "open" amount same as the orb's own grabAmountRef, and
    // keep the focus direction locked to whichever node is currently grabbed (only
    // updates the index while held; direction is re-read from synapseNodePositions each
    // frame so AgentConstellation always lerps toward that node's up-to-date direction).
    const synapseGrabbedIndex = synapseGrabRef.current.index;
    synapseGrabAmountRef.current = THREE.MathUtils.damp(
      synapseGrabAmountRef.current,
      synapseGrabbedIndex !== null ? 1 : 0,
      6,
      delta
    );
    if (synapseGrabbedIndex !== null && synapseNodePositions[synapseGrabbedIndex]) {
      synapseFocusRef.current.direction.copy(synapseNodePositions[synapseGrabbedIndex]);
    }
    synapseFocusRef.current.amount = synapseGrabAmountRef.current;

    // Circular motion (Seção 17) — an OPEN_PALM hand tracing a loop nudges a free spin,
    // independent of the direct pinch-grab above. Only the DOMINANT hand drives this
    // (Seção 56), so the non-dominant "support" hand used for two-hand gestures can't
    // accidentally spin the orb while assisting with something else.
    if (visionLive && grab.hand === null && !twoHandRef.current && !momentumActive && interactionRef.current) {
      const dominant = vision.hands[vision.dominantHand];
      if (dominant?.circularMotion.active && dominant.pose.pose === "OPEN_PALM" && !dominant.pinch.active) {
        const spinSign = dominant.circularMotion.direction === "cw" ? 1 : -1;
        const spinSpeed = Math.min(dominant.circularMotion.angularVelocity, 6) * 0.12;
        interactionRef.current.rotation.y += spinSign * spinSpeed * delta;
      }
    }

    // Cursor-follow tilt — the whole core leans gently toward the pointer,
    // damped so it reads as cinematic weight rather than snapping to the mouse.
    // Suppressed while the user is actively dragging via OrbitControls (see EnergySphere.tsx),
    // grabbing/scaling the orb via pinch, while thrown momentum is still decaying, or while
    // Cinematic Mode (Seção 63) is on — in that case OrbitControls' own autoRotate is the
    // sole idle-motion source, so this doesn't fight it for the same rotation.
    if (
      interactionRef.current &&
      !interacting &&
      !vision.cinematicMode &&
      grab.hand === null &&
      !twoHandRef.current &&
      !momentumActive
    ) {
      const targetY = state.pointer.x * 0.5;
      const targetX = -state.pointer.y * 0.35;
      interactionRef.current.rotation.y = THREE.MathUtils.damp(
        interactionRef.current.rotation.y,
        targetY,
        3,
        delta
      );
      interactionRef.current.rotation.x = THREE.MathUtils.damp(
        interactionRef.current.rotation.x,
        targetX,
        3,
        delta
      );
    }
  });

  const geometryDetail = lowPower ? 48 : 96;
  const intensity = mode === "thinking" ? 1.6 : mode === "speaking" ? 1.2 : mode === "error" ? 1.0 : 0.8;

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color={new THREE.Color(...baseColor)} />
      <pointLight position={[-3, -2, -3]} intensity={0.6} color="#ffffff" />

      {/* Front key light: gives the agent pearls inside the head their glossy highlight. */}
      <pointLight position={[0, 1.4, 4]} intensity={0.9} color="#ffffff" />

      <group ref={interactionRef}>
      {/* Aurora is a head of synapses now, not a glass orb. The orb mesh stays (invisible) only
          as the raycast target for the camera hand-gesture grab/click/menu logic above —
          three.js raycasting ignores `visible`, so those gestures keep working unchanged. */}
      <mesh ref={meshRef} visible={false}>
        <icosahedronGeometry args={[1, geometryDetail / 16]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={sphereVertexShader}
          fragmentShader={sphereFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      <SynapseFace baseColor={baseColor} mode={mode} lowPower={lowPower} />

      {/* Kept mounted but hidden: its node positions/world matrix are still the hit-test data
          for the pinch "agarrar sinapse" gesture. The visible synapses are the head itself. */}
      <group visible={false}>
        <SynapseNetwork
          ref={synapseGroupRef}
          color={baseColor}
          intensity={intensity}
          nodeCount={innerSynapseNodeCount}
          externalPositions={synapseNodePositions}
          grabbedRef={synapseGrabRef}
          grabAmountRef={synapseGrabAmountRef}
          neighborLinks={2}
          longRangeRatio={0.25}
          radius={0.96}
          tilt={[0.3, 0, 0.1]}
          rotationSpeed={0.06}
          rotationAxis={[0, 1, 0.15]}
          baseOpacity={0.03}
          nodeSize={0.012}
          pulseGain={0.22}
        />
      </group>
      </group>
    </group>
  );
}
