import { useEffect, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useJarvisStore } from "../../state/store";
import type { HandSide } from "../../lib/handTracking/types";

const W = 0.62;
const H = 0.82;
const TURN_DURATION_S = 0.55;
const ENTRANCE_DURATION_S = 0.7;
/** Relative to the resting position — where the book visually starts from on summon, so it
 * reads as being tossed in from Aurora's direction rather than popping into place. */
const ENTRANCE_OFFSET = new THREE.Vector3(-1.1, 0.25, -0.35);

const ACCENT = new THREE.Color("#ff7a1a");
const PAGE_COLOR = new THREE.Color("#161008");
const COVER_COLOR = new THREE.Color("#2a1608");

/**
 * The holographic "book" — the net-new 3D object Gustavo asked for: a real document summoned
 * by voice (see documentSummonIntent.ts) that you then grab, open and flip through by hand, in
 * 3D, the same direct-manipulation category as the orb's own grab (SphereScene.tsx) rather
 * than a 2D DOM overlay like SpatialWindowManager. Capped at one document at a time for now
 * (see documentSlice.ts) — content is an honestly-labeled placeholder until a real file exists.
 *
 * Page turning is a real hinge rotation around the spine (0°→180°), not a crossfade: the
 * turning page shows the page being left on its front face and the page being turned TO on its
 * back face (authored with a local 180° rotation, so composing it with the group's own 180°
 * turn lands back at a normal, non-mirrored orientation — no scale-flip hack needed). The store's
 * pageIndex only commits the instant the sweep completes, so the content swap is invisible.
 */
export function HoloBook() {
  const doc = useJarvisStore((s) => s.holoDocument);
  const { camera, raycaster } = useThree();

  const entranceGroupRef = useRef<THREE.Group>(null);
  const turnGroupRef = useRef<THREE.Group>(null);
  const coverHitRef = useRef<THREE.Mesh>(null);
  const closeHitRef = useRef<THREE.Mesh>(null);
  const grabHitRef = useRef<THREE.Mesh>(null);

  const entranceT = useRef(1); // 1 = settled; reset to 0 on a fresh summon
  const lastSummonedAt = useRef(0);
  // Discrete start/stop of a page turn is React state (so the back-face JSX below actually
  // mounts/unmounts) — the continuous sweep angle itself stays a ref, written straight onto
  // turnGroupRef every frame, same as every other per-frame transform in this codebase.
  const [turning, setTurning] = useState<{ direction: 1 | -1; toIndex: number } | null>(null);
  const turnT = useRef(0);
  const lastGestureTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });
  const grabOffsetRef = useRef(new THREE.Vector3());
  const grabPlaneRef = useRef(new THREE.Plane());

  const startTurn = (direction: 1 | -1) => {
    if (!doc || !doc.opened || turning) return;
    const target = doc.pageIndex + direction;
    if (target < 0 || target >= doc.pages.length) return;
    turnT.current = 0;
    setTurning({ direction, toIndex: target });
  };

  // Swipe-to-turn-page (Seção book-flip) — reuses the exact signal usePointerMode.ts already
  // dispatches for BACK/FORWARD when a document is open, instead of a second swipe listener.
  useEffect(() => {
    const onTurn = (e: Event) => {
      const direction = (e as CustomEvent<{ direction: 1 | -1 }>).detail?.direction;
      if (direction) startTurn(direction);
    };
    window.addEventListener("aurora:document-turn-page", onTurn);
    return () => window.removeEventListener("aurora:document-turn-page", onTurn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.opened, doc?.pageIndex, turning]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!doc) return;
    const store = useJarvisStore.getState();

    // --- Entrance (fly-in on summon) ------------------------------------------------------
    if (doc.summonedAt !== lastSummonedAt.current) {
      lastSummonedAt.current = doc.summonedAt;
      entranceT.current = 0;
    }
    if (entranceT.current < 1 && entranceGroupRef.current) {
      entranceT.current = Math.min(1, entranceT.current + delta / ENTRANCE_DURATION_S);
      const eased = 1 - Math.pow(1 - entranceT.current, 3);
      entranceGroupRef.current.position.copy(ENTRANCE_OFFSET).multiplyScalar(1 - eased);
      entranceGroupRef.current.scale.setScalar(0.2 + 0.8 * eased);
      entranceGroupRef.current.rotation.y = (1 - eased) * -0.9;
    } else if (entranceGroupRef.current) {
      entranceGroupRef.current.position.set(0, 0, 0);
      entranceGroupRef.current.scale.setScalar(1);
      entranceGroupRef.current.rotation.y = 0;
    }

    // --- Page turn sweep -------------------------------------------------------------------
    if (turning && turnGroupRef.current) {
      turnT.current = Math.min(1, turnT.current + delta / TURN_DURATION_S);
      const eased = turnT.current < 0.5 ? 2 * turnT.current ** 2 : 1 - ((-2 * turnT.current + 2) ** 2) / 2;
      turnGroupRef.current.rotation.y = turning.direction * Math.PI * eased;
      if (turnT.current >= 1) {
        store.turnDocumentPage(turning.direction);
        turnGroupRef.current.rotation.y = 0;
        turnT.current = 0;
        setTurning(null);
      }
    }

    // --- Vision-driven grab/drag (mirrors SphereScene's orb-grab, own hit targets) ---------
    const visionLive = store.cameraActive && !store.privacyMode;
    if (!visionLive) {
      if (doc.grabbedBy) store.setDocumentGrab(null);
      return;
    }

    (["right", "left"] as HandSide[]).forEach((side) => {
      const hand = store.hands[side];
      if (!hand?.gestureEvent || hand.timestamp === lastGestureTsRef.current[side]) return;

      if (hand.gestureEvent.type === "DRAG_START" && doc.grabbedBy === null && grabHitRef.current) {
        lastGestureTsRef.current[side] = hand.timestamp;
        const ndcX = (1 - hand.pinch.position.x) * 2 - 1;
        const ndcY = -(hand.pinch.position.y * 2 - 1);
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const hit = raycaster.intersectObject(grabHitRef.current, false);
        if (hit.length > 0) {
          store.setDocumentGrab(side);
          grabOffsetRef.current.copy(hit[0].point).sub(new THREE.Vector3(...doc.position));
          grabPlaneRef.current.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()).negate(),
            hit[0].point
          );
        }
      } else if (hand.gestureEvent.type === "DROP" && doc.grabbedBy === side) {
        lastGestureTsRef.current[side] = hand.timestamp;
        store.setDocumentGrab(null);
      } else if (hand.gestureEvent.type === "CLICK") {
        lastGestureTsRef.current[side] = hand.timestamp;
        const ndcX = (1 - hand.pinch.position.x) * 2 - 1;
        const ndcY = -(hand.pinch.position.y * 2 - 1);
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        if (closeHitRef.current && raycaster.intersectObject(closeHitRef.current, false).length > 0) {
          store.closeDocument();
        } else if (!doc.opened && coverHitRef.current && raycaster.intersectObject(coverHitRef.current, false).length > 0) {
          store.openDocument();
        }
      }
    });

    if (doc.grabbedBy) {
      const hand = store.hands[doc.grabbedBy];
      if (!hand || !hand.pinch.active) {
        store.setDocumentGrab(null);
      } else {
        const ndcX = (1 - hand.pinch.position.x) * 2 - 1;
        const ndcY = -(hand.pinch.position.y * 2 - 1);
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const point = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(grabPlaneRef.current, point)) {
          const next = point.sub(grabOffsetRef.current);
          store.setDocumentPosition([next.x, next.y, next.z]);
        }
      }
    }
  });

  if (!doc) return null;

  const frontText = doc.opened ? doc.pages[doc.pageIndex] : doc.title;
  const backText = turning ? doc.pages[turning.toIndex] : "";

  const stopPropagation = (e: ThreeEvent<MouseEvent>) => e.stopPropagation();

  return (
    <group position={doc.position}>
      <group ref={entranceGroupRef}>
        {/* Spine */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.03, H, 0.05]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.35} toneMapped={false} />
        </mesh>

        {/* Invisible full-book hit area for grab/drag — behind everything else. */}
        <mesh ref={grabHitRef} position={[W / 2, 0, -0.03]} visible={false}>
          <planeGeometry args={[W + 0.08, H + 0.08]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {!doc.opened && (
          <mesh ref={coverHitRef} position={[W / 2, 0, 0.001]} onClick={(e) => { stopPropagation(e); useJarvisStore.getState().openDocument(); }}>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial color={COVER_COLOR} roughness={0.5} metalness={0.1} />
          </mesh>
        )}
        {!doc.opened && (
          <Text position={[W / 2, 0, 0.01]} fontSize={0.045} color="#ffd9b0" maxWidth={W - 0.08} textAlign="center" anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#000000">
            {frontText}
          </Text>
        )}

        {doc.opened && (
          <group ref={turnGroupRef}>
            <mesh position={[W / 2, 0, 0.002]}>
              <planeGeometry args={[W, H]} />
              <meshStandardMaterial color={PAGE_COLOR} roughness={0.6} />
            </mesh>
            <Text position={[W / 2, 0, 0.006]} fontSize={0.034} color="#ffe9d6" maxWidth={W - 0.1} textAlign="left" anchorX="center" anchorY="middle">
              {frontText}
            </Text>

            {turning && (
              <>
                <mesh position={[W / 2, 0, -0.002]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[W, H]} />
                  <meshStandardMaterial color={PAGE_COLOR} roughness={0.6} />
                </mesh>
                <Text position={[W / 2, 0, -0.006]} rotation={[0, Math.PI, 0]} fontSize={0.034} color="#ffe9d6" maxWidth={W - 0.1} textAlign="left" anchorX="center" anchorY="middle">
                  {backText}
                </Text>
              </>
            )}
          </group>
        )}

        {doc.opened && (
          <>
            <mesh ref={closeHitRef} position={[W - 0.07, H / 2 - 0.07, 0.02]} onClick={(e) => { stopPropagation(e); useJarvisStore.getState().closeDocument(); }}>
              <circleGeometry args={[0.04, 20]} />
              <meshBasicMaterial color="#d4453b" toneMapped={false} />
            </mesh>
            <Text position={[W - 0.07, H / 2 - 0.07, 0.025]} fontSize={0.045} color="#ffffff" anchorX="center" anchorY="middle">
              ×
            </Text>
          </>
        )}
      </group>
    </group>
  );
}
