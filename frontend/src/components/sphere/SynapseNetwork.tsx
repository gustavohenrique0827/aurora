import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { synapseFragmentShader, synapseVertexShader } from "./synapseShaders";
import { fibonacciSpherePoints } from "./sphereMath";

interface SynapseNetworkProps {
  color: [number, number, number];
  intensity: number;
  nodeCount?: number;
  /** Nearest neighbors each node wires to locally — higher = denser mesh. */
  neighborLinks?: number;
  /** Fraction of nodeCount added as random long-range links (connectome, not lattice). */
  longRangeRatio?: number;
  /** Scale of the whole shell relative to the core (1.0 = hugs the energy sphere). */
  radius?: number;
  /** Static tilt so stacked shells don't share one axis of symmetry. */
  tilt?: [number, number, number];
  rotationSpeed?: number;
  rotationAxis?: [number, number, number];
  baseOpacity?: number;
  /** World-space point size (three.js sizeAttenuation units) — keep small, ~0.015-0.03. */
  nodeSize?: number;
  /** Pre-computed unit-sphere node positions, shared with a parent that needs the exact
   * same array for hit-testing (Seção "agarrar sinapse") — falls back to computing its
   * own via fibonacciSpherePoints(nodeCount) when omitted, so other SynapseNetwork
   * instances (e.g. the outer decorative shell) don't need to change at all. */
  externalPositions?: THREE.Vector3[];
  /** Ref (not a prop value) holding the index into the node array currently
   * pinch-grabbed, or null — read imperatively every frame, same reasoning as
   * grabAmountRef below, so the transition doesn't wait for a React re-render. Draws a
   * small glowing marker at that node so grabbing a synapse has a visible "this one"
   * focal point, inside this component's own rotating group so the marker inherits the
   * exact same tilt/rotation as the nodes themselves with no world-matrix math needed. */
  grabbedRef?: RefObject<{ index: number | null }>;
  /** 0..1, smoothed by the parent — how "open" the grabbed marker currently is. Read
   * imperatively (not a prop value) so per-frame damping never forces a re-render here,
   * matching the grabAmountRef pattern already used for the orb core. */
  grabAmountRef?: RefObject<number>;
  /** Scales the traveling pulse light (1 = original). Kept low on shells that sit behind
   * Aurora's face so their streaks don't compete with it. */
  pulseGain?: number;
}

/**
 * One shell of neuron nodes wired by synapse lines — the abstract "brain" texture
 * layered under the labeled AgentConstellation. Edges pulse with traveling light
 * on top of a dim, always-visible base glow. Nodes use plain THREE.PointsMaterial
 * (sizeAttenuation) deliberately — a custom per-point size shader here previously
 * had a miscalibrated pixel-size constant that blew every point up to cover the
 * screen; PointsMaterial's built-in attenuation is proven safe at this scale.
 *
 * Forwards its own rotating group as a ref so a parent (SphereScene) can read
 * `matrixWorld` once at pinch-start to hit-test individual nodes in world space —
 * see the "agarrar sinapse" pinch-grab feature in SphereScene.tsx.
 */
export const SynapseNetwork = forwardRef<THREE.Group, SynapseNetworkProps>(function SynapseNetwork(
  {
    color,
    intensity,
    nodeCount = 90,
    neighborLinks = 2,
    longRangeRatio = 0.3,
    radius = 0.98,
    tilt = [0, 0, 0],
    rotationSpeed = 0.08,
    rotationAxis = [0, 1, 0],
    baseOpacity = 0.1,
    nodeSize = 0.02,
    externalPositions,
    grabbedRef,
    grabAmountRef,
    pulseGain = 1,
  },
  forwardedRef
) {
  const groupRef = useRef<THREE.Group>(null);
  const lineMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  useImperativeHandle(forwardedRef, () => groupRef.current as THREE.Group, []);

  const nodePositions = useMemo(
    () => externalPositions ?? fibonacciSpherePoints(nodeCount),
    [externalPositions, nodeCount]
  );

  const nodeBuffer = useMemo(() => {
    const positions = new Float32Array(nodePositions.length * 3);
    nodePositions.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    return positions;
  }, [nodePositions]);

  const edgeBuffers = useMemo(() => {
    const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const seen = new Set<string>();
    const edges: [number, number][] = [];

    for (let i = 0; i < nodePositions.length; i++) {
      const distances = nodePositions
        .map((p, j) => ({ j, d: i === j ? Infinity : nodePositions[i].distanceToSquared(p) }))
        .sort((a, b) => a.d - b.d);
      for (const { j } of distances.slice(0, neighborLinks)) {
        const key = edgeKey(i, j);
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      }
    }

    const longRangeCount = Math.round(nodePositions.length * longRangeRatio);
    for (let n = 0; n < longRangeCount; n++) {
      const i = Math.floor(Math.random() * nodePositions.length);
      const j = Math.floor(Math.random() * nodePositions.length);
      const key = edgeKey(i, j);
      if (i !== j && !seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }

    const positions = new Float32Array(edges.length * 2 * 3);
    const progress = new Float32Array(edges.length * 2);
    const seed = new Float32Array(edges.length * 2);

    edges.forEach(([a, b], edgeIndex) => {
      const pa = nodePositions[a];
      const pb = nodePositions[b];
      const base = edgeIndex * 6;
      positions[base] = pa.x;
      positions[base + 1] = pa.y;
      positions[base + 2] = pa.z;
      positions[base + 3] = pb.x;
      positions[base + 4] = pb.y;
      positions[base + 5] = pb.z;

      const s = Math.random();
      progress[edgeIndex * 2] = 0;
      progress[edgeIndex * 2 + 1] = 1;
      seed[edgeIndex * 2] = s;
      seed[edgeIndex * 2 + 1] = s;
    });

    return { positions, progress, seed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodePositions, neighborLinks, longRangeRatio]);

  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 0.3 + Math.random() * 0.15 },
      uIntensity: { value: intensity },
      uColor: { value: new THREE.Color(...color) },
      uBaseOpacity: { value: baseOpacity },
      uPulseGain: { value: pulseGain },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotateOnAxis(new THREE.Vector3(...rotationAxis).normalize(), rotationSpeed * delta);
    }
    if (lineMaterialRef.current) {
      lineUniforms.uTime.value = state.clock.elapsedTime;
      lineUniforms.uIntensity.value = THREE.MathUtils.lerp(lineUniforms.uIntensity.value, intensity, delta * 3);
      lineUniforms.uColor.value.setRGB(...color);
    }
    if (markerRef.current) {
      const grabbedIndex = grabbedRef?.current?.index ?? null;
      if (grabbedIndex !== null && nodePositions[grabbedIndex]) {
        markerRef.current.position.copy(nodePositions[grabbedIndex]);
        const amount = grabAmountRef?.current ?? 0;
        markerRef.current.visible = amount > 0.01;
        markerRef.current.scale.setScalar(0.4 + amount * 2.2);
      } else {
        markerRef.current.visible = false;
      }
    }
  });

  const [r, g, b] = color;

  return (
    <group ref={groupRef} scale={radius} rotation={tilt}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[edgeBuffers.positions, 3]}
            count={edgeBuffers.positions.length / 3}
            array={edgeBuffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aProgress"
            args={[edgeBuffers.progress, 1]}
            count={edgeBuffers.progress.length}
            array={edgeBuffers.progress}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aSeed"
            args={[edgeBuffers.seed, 1]}
            count={edgeBuffers.seed.length}
            array={edgeBuffers.seed}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={lineMaterialRef}
          vertexShader={synapseVertexShader}
          fragmentShader={synapseFragmentShader}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[nodeBuffer, 3]}
            count={nodePositions.length}
            array={nodeBuffer}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={nodeSize}
          color={new THREE.Color(r, g, b)}
          transparent
          opacity={0.8}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* "Sinapse aberta" marker (Seção agarrar-sinapse) — a small glowing bloom at whichever
          node is currently pinch-grabbed. Lives inside this same rotating/tilted group so it
          tracks the node's real position with zero extra transform math; visibility and scale
          both come from the parent's damped grabAmountRef, so it blooms in and settles back
          out exactly like the orb's own grab reaction (SphereCore.tsx). */}
      <mesh ref={markerRef} visible={false}>
        <icosahedronGeometry args={[0.05, 2]} />
        <meshBasicMaterial color={new THREE.Color(r, g, b)} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
});
