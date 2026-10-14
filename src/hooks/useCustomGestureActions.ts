import { useEffect, useRef } from "react";
import { useJarvisStore } from "../state/store";
import type { HandSide } from "../lib/handTracking/types";

/**
 * Executes a custom gesture's bound action (Seção 55) the moment it's newly recognized —
 * edge-triggered per hand, so holding the pose doesn't refire the action every frame.
 * Closes the loop Lote 5 left open ("ação — texto livre por enquanto"): recording is
 * there, this is where it actually does something. Mounted once in AppShell.
 */
export function useCustomGestureActions(onInterruptSpeech: () => void) {
  const toggleCommsDock = useJarvisStore((s) => s.toggleCommsDock);
  const setDebugMode = useJarvisStore((s) => s.setDebugMode);
  const setPrivacyMode = useJarvisStore((s) => s.setPrivacyMode);
  const setCinematicMode = useJarvisStore((s) => s.setCinematicMode);
  const setPointerModeEnabled = useJarvisStore((s) => s.setPointerModeEnabled);
  const setDominantHand = useJarvisStore((s) => s.setDominantHand);
  const lastFiredIdRef = useRef<Record<HandSide, string | null>>({ left: null, right: null });

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const state = useJarvisStore.getState();
      if (state.cameraActive && !state.privacyMode) {
        (["left", "right"] as HandSide[]).forEach((side) => {
          const hand = state.hands[side];
          const matchedId = hand?.pose.pose === "CUSTOM" ? (hand.pose.customGestureId ?? null) : null;

          if (!matchedId) {
            lastFiredIdRef.current[side] = null;
            return;
          }
          if (matchedId === lastFiredIdRef.current[side]) return; // still holding the same one — already fired
          lastFiredIdRef.current[side] = matchedId;

          const def = state.customGestures.find((g) => g.id === matchedId);
          if (!def) return;
          switch (def.action) {
            case "toggle-chat":
              toggleCommsDock();
              break;
            case "toggle-debug":
              setDebugMode(!state.debugMode);
              break;
            case "toggle-privacy":
              setPrivacyMode(true);
              break;
            case "interrupt-speech":
              onInterruptSpeech();
              break;
            case "toggle-cinematic":
              setCinematicMode(!state.cinematicMode);
              break;
            case "toggle-pointer-mode":
              setPointerModeEnabled(!state.pointerModeEnabled);
              break;
            case "swap-dominant-hand":
              setDominantHand(state.dominantHand === "right" ? "left" : "right");
              break;
            default:
              break; // "none" or legacy free-text from before Lote 8 — just a label, no-op
          }
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    onInterruptSpeech,
    toggleCommsDock,
    setDebugMode,
    setPrivacyMode,
    setCinematicMode,
    setPointerModeEnabled,
    setDominantHand,
  ]);
}
