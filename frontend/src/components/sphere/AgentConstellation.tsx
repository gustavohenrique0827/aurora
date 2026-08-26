import { useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { DIRECTORS } from "@jarvis/shared";
import type { DirectorId, N8nWorkflowSummary } from "@jarvis/shared";
import { useJarvisStore } from "../../state/store";
import { fibonacciSpherePoints } from "./sphereMath";

/** A grabbed synapse's unit-sphere direction + how "open" it currently is (0..1, damped).
 * `direction` lives in the same unit-sphere convention as this component's own home
 * positions (both come from fibonacciSpherePoints), so nodes can lerp straight toward it
 * with no world/parent-space conversion. Read imperatively every frame — see grabAmountRef
 * elsewhere in the sphere code for why this is a ref and not a re-rendering prop. */
export interface SynapseFocus {
  direction: THREE.Vector3;
  amount: number;
}

interface AgentConstellationProps {
  color: [number, number, number];
  radius?: number;
  focusRef?: RefObject<SynapseFocus>;
}

const INACTIVE_COLOR = new THREE.Color(0.5, 0.53, 0.58);
const ACTIVE_COLOR = new THREE.Color(0.36, 1.0, 0.69); // matches jarvis-green

interface AgentNodeProps {
  homePosition: THREE.Vector3;
  /** Small deterministic offset from the focus direction so clustered nodes fan out
   * instead of stacking on the exact same point — see AgentConstellation's clusterOffsets. */
  clusterOffset: THREE.Vector3;
  focusRef?: RefObject<SynapseFocus>;
  label: string | null;
  active: boolean;
  isCurrent: boolean;
  isDirector: boolean;
  coreColor: THREE.Color;
  directorId: DirectorId | null;
  onSelect: (id: DirectorId) => void;
}

/** One real n8n workflow: a node wired to the core by a synapse line, colored by its actual `active` flag. Directors (the 10-strong Diretoria Executiva) get a bigger node and a label; the other ~20+ workflows (Gerências, Robôs, produção) render as smaller unlabeled nodes so the sphere reads as one dense, real system instead of ten decorated names. Director nodes are also clickable — same effect as picking that director anywhere else in the app (scopes the persistent chat to them).
 *
 * Position is ref-driven (not a JSX prop) so it can damp smoothly toward a grabbed
 * synapse's focus point and back — see the "agarrar sinapse" feature in SphereScene.tsx.
 * `homePosition` is only the mount-time/rest value; every frame the mesh, connecting line
 * and label all read from `currentPosRef` instead. */
function AgentNode({ homePosition, clusterOffset, focusRef, label, active, isCurrent, isDirector, coreColor, directorId, onSelect }: AgentNodeProps) {
  const nodeGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const lineGeometryRef = useRef<THREE.BufferGeometry>(null);
  const billboardGroupRef = useRef<THREE.Group>(null);
  const currentPosRef = useRef(homePosition.clone());
  const [hovered, setHovered] = useState(false);
  const clickable = directorId !== null;
  const color = isCurrent ? coreColor : active ? ACTIVE_COLOR : INACTIVE_COLOR;

  const linePositions = useMemo(
    () => new Float32Array([0, 0, 0, homePosition.x, homePosition.y, homePosition.z]),
    [homePosition]
  );

  useFrame((state, delta) => {
    const focus = focusRef?.current;
    const amount = focus?.amount ?? 0;
    const targetPos =
      amount > 0.001 && focus
        ? homePosition.clone().lerp(focus.direction.clone().add(clusterOffset), amount)
        : homePosition;
    currentPosRef.current.x = THREE.MathUtils.damp(currentPosRef.current.x, targetPos.x, 5, delta);
    currentPosRef.current.y = THREE.MathUtils.damp(currentPosRef.current.y, targetPos.y, 5, delta);
    currentPosRef.current.z = THREE.MathUtils.damp(currentPosRef.current.z, targetPos.z, 5, delta);
    const pos = currentPosRef.current;

    if (nodeGroupRef.current) nodeGroupRef.current.position.copy(pos);
    if (billboardGroupRef.current) billboardGroupRef.current.position.copy(pos).multiplyScalar(1.14);
    if (lineGeometryRef.current) {
      const posAttr = lineGeometryRef.current.attributes.position as THREE.BufferAttribute;
      posAttr.setXYZ(1, pos.x, pos.y, pos.z);
      posAttr.needsUpdate = true;
    }
    if (meshRef.current) {
      const pulse = isCurrent ? 1 + Math.sin(state.clock.elapsedTime * 3) * 0.25 : active ? 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08 : 1;
      meshRef.current.scale.setScalar(hovered ? pulse * 1.35 : pulse);
    }
  });

  const baseSize = isDirector ? 0.034 : 0.02;
  const nodeSize = isCurrent ? baseSize * 1.6 : active ? baseSize * 1.2 : baseSize;

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!clickable) return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (!clickable) return;
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "auto";
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!directorId) return;
    e.stopPropagation();
    onSelect(directorId);
  };

  return (
    <group>
      <line>
        <bufferGeometry ref={lineGeometryRef}>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} count={2} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={hovered ? 0.6 : active || isCurrent ? 0.32 : 0.08} />
      </line>

      <group ref={nodeGroupRef} position={homePosition}>
        <mesh
          ref={meshRef}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <icosahedronGeometry args={[clickable ? nodeSize * 1.8 : nodeSize, 1]} />
          <meshBasicMaterial color={hovered ? "#ffffff" : color} toneMapped={false} transparent opacity={clickable && !hovered ? 0 : 1} />
        </mesh>
        {clickable && (
          <mesh>
            <icosahedronGeometry args={[nodeSize, 1]} />
            <meshBasicMaterial color={hovered ? "#ffffff" : color} toneMapped={false} />
          </mesh>
        )}
      </group>

      {label && (
        <group ref={billboardGroupRef} position={homePosition.clone().multiplyScalar(1.14)}>
          <Billboard>
            <Text
              fontSize={hovered ? 0.07 : 0.058}
              color={hovered ? "#ffffff" : active || isCurrent ? "#ffffff" : "#8a8f98"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.004}
              outlineColor="#000000"
            >
              {label}
            </Text>
          </Billboard>
        </group>
      )}
    </group>
  );
}

function shortLabel(workflowName: string): string | null {
  const name = workflowName.replace("[G-TECH AI OS] ", "");
  const director = DIRECTORS.find((d) => d.name === name);
  return director ? director.name.replace(" AI", "") : null;
}

function matchDirectorId(workflowName: string): DirectorId | null {
  const name = workflowName.replace("[G-TECH AI OS] ", "");
  return DIRECTORS.find((d) => d.name === name)?.id ?? null;
}

/**
 * Renders the REAL n8n agent roster — every workflow in the live dashboard snapshot,
 * not just the 10 directors — as a constellation around the core. Color and pulse
 * reflect the actual `active` flag, so if the system genuinely has 2 active workflows
 * out of ~32, the sphere shows exactly that: 2 lit nodes, the rest dim. This is
 * deliberately NOT decoration — it's the same data `AutomacoesPage` shows in its
 * "N ativos · M inativos" counter, so the sphere can never disagree with the dashboard.
 *
 * When `focusRef` reports an open synapse (Seção agarrar-sinapse), every node damps
 * toward a tight cluster near that synapse's direction instead of its normal orbit spot —
 * "the agents appear inside the opened synapse" — and back out when it closes. The data
 * shown never changes because of this, only where it's drawn: still the same real
 * workflows, same real active/inactive colors, same real click-to-select.
 */
export function AgentConstellation({ color, radius = 1.4, focusRef }: AgentConstellationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const snapshot = useJarvisStore((s) => s.dashboardSnapshot);
  const activeDirectorId = useJarvisStore((s) => s.activeDirectorId);
  const setActiveDirectorId = useJarvisStore((s) => s.setActiveDirectorId);

  const workflows: N8nWorkflowSummary[] = snapshot?.n8n.data?.workflows ?? [];
  const positions = useMemo(() => fibonacciSpherePoints(Math.max(workflows.length, 1)), [workflows.length]);
  // A tight, deterministic fan-out (same distribution, much smaller radius) so clustered
  // nodes spread apart instead of stacking on the exact same point inside the synapse.
  const clusterOffsets = useMemo(
    () => fibonacciSpherePoints(Math.max(workflows.length, 1)).map((p) => p.clone().multiplyScalar(0.16)),
    [workflows.length]
  );
  const coreColor = useMemo(() => new THREE.Color(...color), [color]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  if (workflows.length === 0) return null;

  return (
    <group ref={groupRef} scale={radius}>
      {workflows.map((workflow, i) => (
        <AgentNode
          key={workflow.id}
          homePosition={positions[i]}
          clusterOffset={clusterOffsets[i]}
          focusRef={focusRef}
          label={shortLabel(workflow.name)}
          active={workflow.active}
          isCurrent={activeDirectorId !== null && matchDirectorId(workflow.name) === activeDirectorId}
          isDirector={shortLabel(workflow.name) !== null}
          coreColor={coreColor}
          directorId={matchDirectorId(workflow.name)}
          onSelect={setActiveDirectorId}
        />
      ))}
    </group>
  );
}
