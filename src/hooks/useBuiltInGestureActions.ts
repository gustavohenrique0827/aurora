import { useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";
import { BUILT_IN_GESTURE_BINDINGS } from "../lib/handTracking/builtInGestureActions";
import type { HandSide, PoseName } from "../lib/handTracking/types";

/**
 * Executes the fixed pose→action bindings in builtInGestureActions.ts the moment a bound
 * pose is newly recognized on either hand — same edge-triggered-per-hand shape as
 * useCustomGestureActions.ts, so these work without recording anything first (Seção 55
 * still exists for custom shapes; this is the "day one" layer on top of the built-in pose
 * table from Lote 1/2). Entirely off when builtInGestureShortcutsEnabled is false
 * (Configurações). Mounted once in AppShell, alongside the other global gesture-consuming
 * hooks.
 */
export function useBuiltInGestureActions(onInterruptSpeech: () => void) {
  const toggleCommsDock = useJarvisStore((s) => s.toggleCommsDock);
  const setDebugMode = useJarvisStore((s) => s.setDebugMode);
  const setCinematicMode = useJarvisStore((s) => s.setCinematicMode);
  const setPointerModeEnabled = useJarvisStore((s) => s.setPointerModeEnabled);
  const lastFiredPoseRef = useRef<Record<HandSide, PoseName | null>>({ left: null, right: null });

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const state = useJarvisStore.getState();
      if (state.cameraActive && !state.privacyMode && state.builtInGestureShortcutsEnabled) {
        (["left", "right"] as HandSide[]).forEach((side) => {
          const hand = state.hands[side];
          const pose = hand?.pose.pose ?? null;
          const action = pose ? BUILT_IN_GESTURE_BINDINGS[pose] : undefined;

          if (!action) {
            lastFiredPoseRef.current[side] = null;
            return;
          }
          if (pose === lastFiredPoseRef.current[side]) return; // still holding — already fired
          lastFiredPoseRef.current[side] = pose;

          switch (action) {
            case "toggle-chat":
              toggleCommsDock();
              break;
            case "toggle-debug":
              setDebugMode(!state.debugMode);
              break;
            case "toggle-cinematic":
              setCinematicMode(!state.cinematicMode);
              break;
            case "toggle-pointer-mode":
              setPointerModeEnabled(!state.pointerModeEnabled);
              break;
            case "interrupt-speech":
              onInterruptSpeech();
              break;
            default:
              break; // not a binding this layer knows how to run (e.g. "swap-dominant-hand" stays custom-gesture-only for now)
          }
        });
      } else {
        lastFiredPoseRef.current.left = null;
        lastFiredPoseRef.current.right = null;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onInterruptSpeech, toggleCommsDock, setDebugMode, setCinematicMode, setPointerModeEnabled]);
}
