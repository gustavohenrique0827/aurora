import { useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";
import { mapHandToScreen } from "../lib/handTracking/calibration";
import type { HandSide } from "../lib/handTracking/types";

interface DragState {
  side: HandSide;
  el: HTMLElement;
  offsetX: number;
  offsetY: number;
}

/**
 * Direct pinch-drag repositioning for "spatial windows" (Seção 52/53) — any element
 * opting in via `data-gesture-window="true"` can be grabbed and moved by hand, the same
 * direct-manipulation category as the orb's own grab (Lotes 1-3), just for flat 2D UI
 * instead of the 3D scene. GestureDebugPanel opted in during Lote 8 but was moved back to
 * a fixed position afterward (dragging it around competed with reading it while
 * gesturing) — no element currently opts in, so this is the primitive on standby, not a
 * feature wired to a specific consumer. Works independent of pointer mode, same as the
 * orb: this is direct manipulation, not synthetic-event dispatch (see usePointerMode.ts,
 * which explicitly skips these elements so the two never fight over the same drag).
 */
export function useSpatialWindows() {
  const dragRef = useRef<DragState | null>(null);
  const lastTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const state = useJarvisStore.getState();
      const live = state.cameraActive && !state.privacyMode;

      if (live) {
        (["left", "right"] as HandSide[]).forEach((side) => {
          const hand = state.hands[side];
          if (!hand?.gestureEvent || hand.timestamp === lastTsRef.current[side]) return;

          if (hand.gestureEvent.type === "DRAG_START") {
            lastTsRef.current[side] = hand.timestamp;
            const pos = mapHandToScreen(
              hand.pinch.position.x,
              hand.pinch.position.y,
              state.pointerCalibration,
              window.innerWidth,
              window.innerHeight
            );
            const el = document.elementFromPoint(pos.x, pos.y)?.closest<HTMLElement>("[data-gesture-window]");
            if (el) {
              const rect = el.getBoundingClientRect();
              dragRef.current = { side, el, offsetX: pos.x - rect.left, offsetY: pos.y - rect.top };
            }
          } else if (hand.gestureEvent.type === "DROP" && dragRef.current?.side === side) {
            lastTsRef.current[side] = hand.timestamp;
            dragRef.current = null;
          }
        });

        const drag = dragRef.current;
        if (drag) {
          const hand = state.hands[drag.side];
          if (!hand || !hand.pinch.active) {
            dragRef.current = null; // hand lost, or pinch released without a clean DROP event
          } else {
            const pos = mapHandToScreen(
              hand.pinch.position.x,
              hand.pinch.position.y,
              state.pointerCalibration,
              window.innerWidth,
              window.innerHeight
            );
            drag.el.style.left = `${pos.x - drag.offsetX}px`;
            drag.el.style.top = `${pos.y - drag.offsetY}px`;
            drag.el.style.bottom = "auto";
            drag.el.style.right = "auto";
          }
        }
      } else if (dragRef.current) {
        dragRef.current = null;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
