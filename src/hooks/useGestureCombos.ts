import { useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";
import { ClapDetector } from "../lib/handTracking/gestureCombos";

/**
 * Two-hand gesture combos (Seção 34) — mounted once in AppShell, alongside the other
 * global gesture-consuming hooks (usePointerMode, etc.). Currently just the clap: both
 * wrists closing together fast opens the Gesture Debug panel — a hands-free way to check
 * "is Aurora actually seeing my hands right now" (skeleton, pose, pinch ratio) without
 * reaching for Configurações mid-gesture. (The two-hand OPEN_PALM "stop speech" combo that
 * used to live here was removed — useBuiltInGestureActions.ts's single-hand CLOSED_FIST
 * already does the same thing, faster, and having both meant two gestures for one action.)
 * More combos can register the same way later without touching the detectors themselves.
 */
export function useGestureCombos() {
  const clapRef = useRef(new ClapDetector());
  const setDebugMode = useJarvisStore((s) => s.setDebugMode);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const state = useJarvisStore.getState();
      if (state.cameraActive && !state.privacyMode) {
        const clapped = clapRef.current.update(
          state.hands.left
            ? { x: state.hands.left.wrist.x, y: state.hands.left.wrist.y, velocity: state.hands.left.velocity }
            : null,
          state.hands.right
            ? { x: state.hands.right.wrist.x, y: state.hands.right.wrist.y, velocity: state.hands.right.velocity }
            : null
        );
        // Opens, never toggles — a clap is for pulling the panel up to check tracking, not
        // for closing it (that stays the panel's own X button, so a stray clap can't yank
        // it away mid-read).
        if (clapped) setDebugMode(true);
      } else {
        clapRef.current.reset();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setDebugMode]);
}
