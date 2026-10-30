import { useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";
import { mapHandToScreen } from "../lib/handTracking/calibration";
import { clampWindowPosition } from "../lib/spatialWindowBounds";
import type { HandSide } from "../lib/handTracking/types";

interface DragState {
  side: HandSide;
  el: HTMLElement;
  windowId: string | null;
  width: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Direct pinch-drag repositioning for "spatial windows" (Seção 52/53) — any element
 * opting in via `data-gesture-window="true"` can be grabbed and moved by hand, the same
 * direct-manipulation category as the orb's own grab (Lotes 1-3), just for flat 2D UI
 * instead of the 3D scene. SpatialWindowManager's windows opt in. Works independent of
 * pointer mode, same as the orb: this is direct manipulation, not synthetic-event
 * dispatch (see usePointerMode.ts, which explicitly skips these elements so the two
 * never fight over the same drag).
 *
 * Position is mutated directly on the DOM element every frame (not via the store) to
 * avoid a React re-render at tracking framerate — but that means the store's x/y go
 * stale the instant a drag starts. On DROP (or if the hand/pinch is lost mid-drag) the
 * final position is written back once via `updateSpatialWindow`, so it survives the next
 * store-driven re-render (focus, minimize/maximize, projector sync) instead of snapping
 * back to wherever it was before the gesture-drag.
 */
export function useSpatialWindows() {
  const dragRef = useRef<DragState | null>(null);
  const lastTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });

  const commitDrag = (drag: DragState) => {
    drag.el.style.transition = "";
    if (!drag.windowId) return;
    const left = parseFloat(drag.el.style.left) || 0;
    const top = parseFloat(drag.el.style.top) || 0;
    const { x, y } = clampWindowPosition(left, top, drag.width);
    useJarvisStore.getState().updateSpatialWindow(drag.windowId, { x, y });
  };

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
              el.style.transition = "none"; // avoid fighting the per-frame position writes below
              dragRef.current = {
                side,
                el,
                windowId: el.getAttribute("data-spatial-window-id"),
                width: rect.width,
                offsetX: pos.x - rect.left,
                offsetY: pos.y - rect.top,
              };
            }
          } else if (hand.gestureEvent.type === "DROP" && dragRef.current?.side === side) {
            lastTsRef.current[side] = hand.timestamp;
            commitDrag(dragRef.current);
            dragRef.current = null;
          }
        });

        const drag = dragRef.current;
        if (drag) {
          const hand = state.hands[drag.side];
          if (!hand || !hand.pinch.active) {
            commitDrag(drag); // hand lost, or pinch released without a clean DROP event
            dragRef.current = null;
          } else {
            const pos = mapHandToScreen(
              hand.pinch.position.x,
              hand.pinch.position.y,
              state.pointerCalibration,
              window.innerWidth,
              window.innerHeight
            );
            const { x, y } = clampWindowPosition(pos.x - drag.offsetX, pos.y - drag.offsetY, drag.width);
            drag.el.style.left = `${x}px`;
            drag.el.style.top = `${y}px`;
            drag.el.style.bottom = "auto";
            drag.el.style.right = "auto";
          }
        }
      } else if (dragRef.current) {
        commitDrag(dragRef.current); // camera/tracking turned off mid-drag
        dragRef.current = null;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
