import { useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";
import { mapHandToScreen } from "../lib/handTracking/calibration";
import { OneEuroFilter2D } from "../lib/handTracking/smoothing";
import { applyHomography } from "../lib/projection/homography";
import { projectorSync } from "../lib/projection/projectorSync";
import type { AirGestureEvent, HandSide } from "../lib/handTracking/types";

const INDEX_TIP = 8;
const SCROLL_SCALE = 600;

function isDirectManipulationTarget(el: Element | null): boolean {
  if (!el) return false;
  if (el.closest("button") || el.closest("a") || el.closest("input")) return false;
  return el.tagName === "CANVAS" || !!el.closest("canvas") || !!el.closest("[data-gesture-window]");
}

function eventOpts(x: number, y: number): MouseEventInit {
  return { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
}

function dispatchClick(el: Element, x: number, y: number, double: boolean) {
  const opts = eventOpts(x, y);
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
  if (double) el.dispatchEvent(new MouseEvent("dblclick", opts));
}

export function usePointerMode() {
  const rafRef = useRef<number | null>(null);
  const dragTargetRef = useRef<{ side: HandSide; el: Element } | null>(null);
  const holdingRef = useRef<Record<HandSide, boolean>>({ left: false, right: false });
  const lastEventTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });
  const filterRef = useRef(new OneEuroFilter2D(1.2, 0.05, 1.0));

  useEffect(() => {
    function handleEvent(
      event: AirGestureEvent,
      side: HandSide,
      pos: { x: number; y: number },
      projNormPos: { x: number; y: number }
    ) {
      const state = useJarvisStore.getState();

      switch (event.type) {
        case "CLICK":
        case "DOUBLE_CLICK": {
          const el = document.elementFromPoint(pos.x, pos.y);
          if (el && !isDirectManipulationTarget(el)) {
            dispatchClick(el, pos.x, pos.y, event.type === "DOUBLE_CLICK");
            if (!el.closest("[data-gesture-selectable]")) {
              document
                .querySelectorAll('[data-gesture-selected="true"]')
                .forEach((sel) => sel.removeAttribute("data-gesture-selected"));
            }
          }
          projectorSync.send({
            type: "CURSOR_CLICK",
            pos: projNormPos,
            double: event.type === "DOUBLE_CLICK",
          });
          break;
        }
        case "HOLD_START": {
          const el = document.elementFromPoint(pos.x, pos.y);
          if (!isDirectManipulationTarget(el)) holdingRef.current[side] = true;
          break;
        }
        case "HOLD_END": {
          if (!holdingRef.current[side]) break;
          holdingRef.current[side] = false;
          const elements = Array.from(
            document.querySelectorAll('[data-gesture-selectable][data-gesture-selected="true"]')
          );
          window.dispatchEvent(new CustomEvent("aurora:gesture-selection-changed", { detail: { elements } }));
          break;
        }
        case "DRAG_START": {
          const el = document.elementFromPoint(pos.x, pos.y);
          if (el && !isDirectManipulationTarget(el)) {
            dragTargetRef.current = { side, el };
            const opts = eventOpts(pos.x, pos.y);
            el.dispatchEvent(new PointerEvent("pointerdown", opts));
            el.dispatchEvent(new MouseEvent("mousedown", opts));
          }
          break;
        }
        case "DRAG_MOVE": {
          const drag = dragTargetRef.current;
          if (drag && drag.side === side) {
            const opts = eventOpts(pos.x, pos.y);
            drag.el.dispatchEvent(new PointerEvent("pointermove", opts));
            drag.el.dispatchEvent(new MouseEvent("mousemove", opts));
          }
          break;
        }
        case "DROP": {
          const drag = dragTargetRef.current;
          if (drag && drag.side === side) {
            const opts = eventOpts(pos.x, pos.y);
            drag.el.dispatchEvent(new PointerEvent("pointerup", opts));
            drag.el.dispatchEvent(new MouseEvent("mouseup", opts));
          }
          dragTargetRef.current = null;
          break;
        }
        case "SCROLL": {
          const el = document.elementFromPoint(pos.x, pos.y);
          if (el && !isDirectManipulationTarget(el)) {
            el.dispatchEvent(
              new WheelEvent("wheel", { ...eventOpts(pos.x, pos.y), deltaY: -event.delta * SCROLL_SCALE })
            );
          }
          break;
        }
        case "BACK":
          if (state.experienceMode === "presentation") {
            state.prevPresentationSlide();
          } else {
            window.history.back();
          }
          break;
        case "FORWARD":
          if (state.experienceMode === "presentation") {
            state.nextPresentationSlide();
          } else {
            window.history.forward();
          }
          break;
        case "CONFIRM":
          window.dispatchEvent(new CustomEvent("aurora:gesture-confirm"));
          break;
        case "CANCEL":
          window.dispatchEvent(new CustomEvent("aurora:gesture-cancel"));
          break;
      }
    }

    function tick() {
      const state = useJarvisStore.getState();
      const active = state.pointerModeEnabled && state.cameraActive && !state.privacyMode;

      if (!active) {
        if (state.pointerPosition) state.setPointerPosition(null);
        if (state.projectorPointerPosition) state.setProjectorPointerPosition(null);
        dragTargetRef.current = null;
        holdingRef.current.left = false;
        holdingRef.current.right = false;
        filterRef.current.reset();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const hand = state.hands[state.dominantHand];
      if (!hand) {
        if (state.pointerPosition) state.setPointerPosition(null);
        if (state.projectorPointerPosition) state.setProjectorPointerPosition(null);
        filterRef.current.reset();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const rawTip = hand.landmarks[INDEX_TIP];
      const now = performance.now();
      // Apply One-Euro filter to raw camera landmarks
      const smoothTip = filterRef.current.filter({ x: rawTip.x, y: rawTip.y }, now);

      // 1. Standard screen coordinates
      const screenPos = mapHandToScreen(
        smoothTip.x,
        smoothTip.y,
        state.pointerCalibration,
        window.innerWidth,
        window.innerHeight
      );
      state.setPointerPosition(screenPos);

      // 2. Homography-transformed normalized projection coordinates [0,1]
      // Mirror x for selfie convention before homography transform
      const camNormPoint = { x: 1 - smoothTip.x, y: smoothTip.y };
      const projNormPos = applyHomography(state.homographyMatrix, camNormPoint);
      const clampedProjNorm = {
        x: Math.max(0, Math.min(1, projNormPos.x)),
        y: Math.max(0, Math.min(1, projNormPos.y)),
      };
      state.setProjectorPointerPosition(clampedProjNorm);

      // Send to Projector View via BroadcastChannel
      projectorSync.send({
        type: "CURSOR_MOVE",
        pos: clampedProjNorm,
        pinchActive: hand.pinch.active,
        pointing: hand.pose.pose === "POINTING",
      });

      if (holdingRef.current[state.dominantHand]) {
        const el = document.elementFromPoint(screenPos.x, screenPos.y);
        const selectable = el?.closest("[data-gesture-selectable]");
        if (selectable) selectable.setAttribute("data-gesture-selected", "true");
      }

      if (hand.gestureEvent && hand.timestamp !== lastEventTsRef.current[state.dominantHand]) {
        lastEventTsRef.current[state.dominantHand] = hand.timestamp;
        handleEvent(hand.gestureEvent, state.dominantHand, screenPos, clampedProjNorm);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
