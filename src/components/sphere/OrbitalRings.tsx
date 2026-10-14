import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group } from "three";

interface RingConfig {
  radius: number;
  thickness: number;
  rotationAxis: [number, number, number];
  speed: number;
  tiltX: number;
  tiltZ: number;
  opacity: number;
}

const RINGS: RingConfig[] = [
  { radius: 1.65, thickness: 0.006, rotationAxis: [0, 1, 0.2], speed: 0.22, tiltX: 1.1, tiltZ: 0.2, opacity: 0.5 },
  { radius: 1.85, thickness: 0.005, rotationAxis: [1, 0.3, 0], speed: -0.14, tiltX: 0.3, tiltZ: 1.3, opacity: 0.4 },
  { radius: 2.05, thickness: 0.004, rotationAxis: [0.2, 1, 1], speed: 0.09, tiltX: 1.4, tiltZ: 0.6, opacity: 0.3 },
  { radius: 2.25, thickness: 0.003, rotationAxis: [1, 0, 0.5], speed: -0.11, tiltX: 0.7, tiltZ: 1.6, opacity: 0.22 },
];

interface OrbitalRingsProps {
  color: [number, number, number];
  active: boolean;
}

/** Arc-reactor style orbital rings — a cheap, high-impact way to read as "sci-fi HUD" rather than just a glowing ball. */
export function OrbitalRings({ color, active }: OrbitalRingsProps) {
  const groupRefs = useRef<(Group | null)[]>([]);

  useFrame((_, delta) => {
    RINGS.forEach((ring, i) => {
      const group = groupRefs.current[i];
      if (!group) return;
      const speedMultiplier = active ? 1.8 : 1;
      group.rotateOnAxis(new THREE.Vector3(...ring.rotationAxis).normalize(), ring.speed * speedMultiplier * delta);
    });
  });

  const [r, g, b] = color;
  const threeColor = new THREE.Color(r, g, b);

  return (
    <>
      {RINGS.map((ring, i) => (
        <group key={i} ref={(el) => (groupRefs.current[i] = el)} rotation={[ring.tiltX, 0, ring.tiltZ]}>
          <mesh>
            <torusGeometry args={[ring.radius, ring.thickness, 8, 128]} />
            <meshBasicMaterial color={threeColor} transparent opacity={active ? ring.opacity * 1.4 : ring.opacity} />
          </mesh>
        </group>
      ))}
    </>
  );
}
