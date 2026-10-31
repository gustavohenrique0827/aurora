import { Suspense, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useJarvisStore } from "../../state/store";
import type { EvidenceCardKind } from "../../state/slices/evidenceBoardSlice";
import type { HandSide } from "../../lib/handTracking/types";

const CARD_W = 0.42;
const CARD_H = 0.3;

const KIND_COLOR: Record<EvidenceCardKind, THREE.Color> = {
  text: new THREE.Color("#2a2015"),
  photo: new THREE.Color("#1a2630"),
  verdict: new THREE.Color("#3a1610"),
};
const KIND_LABEL_COLOR: Record<EvidenceCardKind, string> = {
  text: "#ffd9b0",
  photo: "#b0d8ff",
  verdict: "#ffb0a0",
};

/**
 * Evidence board — several small cards you grab and drag independently (one per topic found),
 * as opposed to HoloBook's single flippable object. Same direct-manipulation category as the
 * orb's own grab, generalized to N targets instead of one. See investigationIntent.ts and
 * evidenceBoardPlaceholderContent.ts for why the "verdict" card is always a neutral
 * "INDETERMINADO" placeholder right now — there is no real fact-checking backend behind this
 * yet, and a convincing-looking fake verdict would be a real misinformation risk.
 */
export function EvidenceBoard() {
  const cards = useJarvisStore((s) => s.evidenceCards);
  const { camera, raycaster, controls } = useThree();
  // See the identical comment in HoloBook.tsx — OrbitControls listens on the canvas DOM
  // element directly, outside R3F's synthetic event system, so it must be disabled explicitly
  // during a card drag or it fights the raycast with its own camera rotation.
  const setOrbitControlsEnabled = (enabled: boolean) => {
    const c = controls as { enabled?: boolean } | null;
    if (c && "enabled" in c) c.enabled = enabled;
  };

  const hitRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const lastGestureTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });
  const grabOffsetRef = useRef<Record<HandSide, THREE.Vector3>>({ left: new THREE.Vector3(), right: new THREE.Vector3() });
  const grabPlaneRef = useRef<Record<HandSide, THREE.Plane>>({ left: new THREE.Plane(), right: new THREE.Plane() });
  const grabCardIdRef = useRef<Record<HandSide, string | null>>({ left: null, right: null });

  // Real mouse/trackpad/touchscreen drag — independent of the camera/gesture pipeline above,
  // same raycast-vs-plane math, just driven by a real PointerEvent on the card itself instead
  // of a hand frame. Only one real pointer device at a time, so a single slot (not per-hand).
  const pointerDragCardIdRef = useRef<string | null>(null);
  const pointerGrabOffsetRef = useRef(new THREE.Vector3());
  const pointerGrabPlaneRef = useRef(new THREE.Plane());

  useFrame((state) => {
    const store = useJarvisStore.getState();
    const liveCards = store.evidenceCards;
    if (liveCards.length === 0) {
      if (pointerDragCardIdRef.current) setOrbitControlsEnabled(true);
      pointerDragCardIdRef.current = null;
      return;
    }

    if (pointerDragCardIdRef.current) {
      raycaster.setFromCamera(state.pointer, camera);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(pointerGrabPlaneRef.current, point)) {
        const next = point.sub(pointerGrabOffsetRef.current);
        store.setEvidenceCardPosition(pointerDragCardIdRef.current, [next.x, next.y, next.z]);
      }
    }

    const visionLive = store.cameraActive && !store.privacyMode;
    if (!visionLive) {
      liveCards.forEach((c) => {
        if (c.grabbedBy) store.setEvidenceCardGrab(c.id, null);
      });
      (["left", "right"] as HandSide[]).forEach((s) => (grabCardIdRef.current[s] = null));
      return;
    }

    (["right", "left"] as HandSide[]).forEach((side) => {
      const hand = store.hands[side];
      if (!hand?.gestureEvent || hand.timestamp === lastGestureTsRef.current[side]) return;

      if (hand.gestureEvent.type === "DRAG_START" && grabCardIdRef.current[side] === null) {
        lastGestureTsRef.current[side] = hand.timestamp;
        const ndcX = (1 - hand.pinch.position.x) * 2 - 1;
        const ndcY = -(hand.pinch.position.y * 2 - 1);
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const meshes = Object.values(hitRefs.current).filter((m): m is THREE.Mesh => !!m);
        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
          const hitMesh = hits[0].object;
          const cardId = Object.keys(hitRefs.current).find((id) => hitRefs.current[id] === hitMesh);
          const card = cardId ? liveCards.find((c) => c.id === cardId) : null;
          if (cardId && card && card.grabbedBy === null) {
            grabCardIdRef.current[side] = cardId;
            store.setEvidenceCardGrab(cardId, side);
            grabOffsetRef.current[side].copy(hits[0].point).sub(new THREE.Vector3(...card.position));
            grabPlaneRef.current[side].setFromNormalAndCoplanarPoint(
              camera.getWorldDirection(new THREE.Vector3()).negate(),
              hits[0].point
            );
          }
        }
      } else if (hand.gestureEvent.type === "DROP" && grabCardIdRef.current[side]) {
        lastGestureTsRef.current[side] = hand.timestamp;
        store.setEvidenceCardGrab(grabCardIdRef.current[side] as string, null);
        grabCardIdRef.current[side] = null;
      }
    });

    (["right", "left"] as HandSide[]).forEach((side) => {
      const cardId = grabCardIdRef.current[side];
      if (!cardId) return;
      const hand = store.hands[side];
      if (!hand || !hand.pinch.active) {
        store.setEvidenceCardGrab(cardId, null);
        grabCardIdRef.current[side] = null;
        return;
      }
      const ndcX = (1 - hand.pinch.position.x) * 2 - 1;
      const ndcY = -(hand.pinch.position.y * 2 - 1);
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(grabPlaneRef.current[side], point)) {
        const next = point.sub(grabOffsetRef.current[side]);
        store.setEvidenceCardPosition(cardId, [next.x, next.y, next.z]);
      }
    });
  });

  if (cards.length === 0) return null;

  return (
    <>
      {cards.map((card) => (
        <group key={card.id} position={card.position}>
          <mesh
            ref={(el) => { hitRefs.current[card.id] = el; }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (card.grabbedBy !== null || pointerDragCardIdRef.current !== null) return;
              pointerDragCardIdRef.current = card.id;
              setOrbitControlsEnabled(false);
              pointerGrabOffsetRef.current.copy(e.point).sub(new THREE.Vector3(...card.position));
              pointerGrabPlaneRef.current.setFromNormalAndCoplanarPoint(
                camera.getWorldDirection(new THREE.Vector3()).negate(),
                e.point
              );
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (pointerDragCardIdRef.current === card.id) pointerDragCardIdRef.current = null;
              setOrbitControlsEnabled(true);
              (e.target as Element).releasePointerCapture?.(e.pointerId);
            }}
          >
            <planeGeometry args={[CARD_W, CARD_H]} />
            <meshStandardMaterial color={KIND_COLOR[card.kind]} roughness={0.55} />
          </mesh>
          <Suspense fallback={null}>
            <Text
              position={[0, CARD_H / 2 - 0.045, 0.006]}
              fontSize={0.026}
              color={KIND_LABEL_COLOR[card.kind]}
              maxWidth={CARD_W - 0.06}
              textAlign="center"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.002}
              outlineColor="#000000"
            >
              {card.label}
            </Text>
          </Suspense>
          <Suspense fallback={null}>
            <Text
              position={[0, -0.025, 0.006]}
              fontSize={0.016}
              color="#e6ddd2"
              maxWidth={CARD_W - 0.06}
              textAlign="center"
              anchorX="center"
              anchorY="middle"
            >
              {card.body}
            </Text>
          </Suspense>
        </group>
      ))}
    </>
  );
}
