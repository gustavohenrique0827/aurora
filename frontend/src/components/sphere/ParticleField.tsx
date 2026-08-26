import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  color: [number, number, number];
  active: boolean;
  count?: number;
}

/**
 * Performance budget: a few thousand points max, not tens of thousands —
 * this keeps the sphere viable on integrated GPUs. See EnergySphere's FPS
 * downgrade for the next layer of defense if even this is too heavy.
 */
export function ParticleField({ color, active, count = 2200 }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1.35 + Math.random() * 0.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = radius * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * (active ? 0.12 : 0.04);
    pointsRef.current.rotation.x += delta * 0.01;
  });

  const [r, g, b] = color;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={active ? 0.02 : 0.014}
        color={new THREE.Color(r, g, b)}
        transparent
        opacity={active ? 0.85 : 0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
