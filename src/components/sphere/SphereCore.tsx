import { useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh } from "three";

interface SphereCoreProps {
  color: [number, number, number];
  intensity: number;
  grabAmountRef?: RefObject<number>;
}

/**
 * Sci-Fi Holographic Core with inner energy pulse and subtle outer containment wireframe.
 */
export function SphereCore({ color, intensity, grabAmountRef }: SphereCoreProps) {
  const coreRef = useRef<Mesh>(null);
  const wireRef = useRef<Mesh>(null);
  const innerRingRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const grabAmount = grabAmountRef?.current ?? 0;

    if (coreRef.current) {
      const pulse = (0.42 + Math.sin(t * 2.2) * 0.04 + intensity * 0.08) * (1 - grabAmount * 0.15);
      coreRef.current.scale.setScalar(pulse);
      coreRef.current.rotation.y += delta * 0.4;
    }

    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.25;
      wireRef.current.rotation.x += delta * 0.1;
      wireRef.current.scale.setScalar(0.95 * (1 - grabAmount * 0.1));
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z += delta * 0.5;
      innerRingRef.current.rotation.x += delta * 0.2;
    }
  });

  const [r, g, b] = color;
  const coreColor = new THREE.Color(r, g, b).multiplyScalar(0.9);
  const wireColor = new THREE.Color(r, g, b);

  return (
    <group>
      {/* Inner pulsating core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.75, 2]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.45} toneMapped={false} />
      </mesh>

      {/* Holographic Wireframe Containment Cage */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.0, 1]} />
        <meshBasicMaterial color={wireColor} wireframe transparent opacity={0.35} toneMapped={false} />
      </mesh>

      {/* Micro Energy Ring */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[0.85, 0.012, 8, 32]} />
        <meshBasicMaterial color={wireColor} transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
}
