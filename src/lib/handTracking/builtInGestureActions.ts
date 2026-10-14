import type { PoseName } from "./types";
import type { CustomGestureActionId } from "./customGestureActions";

/**
 * Fixed pose → action bindings that work out of the box, no recording required (unlike
 * customGestures.ts, Seção 41/55, which needs the user to record a snapshot first). Only
 * poses with a plausible mnemonic and zero overlap with an existing real use of that pose
 * are bound here — the point is more gestures actually doing something, not every
 * recognized pose forced into an arbitrary action.
 *
 * Deliberately NOT bound here, and why:
 * - PINCH/OK: already the orb grab/zoom channel (SphereScene.tsx) — a single-hand pinch
 *   that lands near one of the inner SynapseNetwork's nodes now opens that synapse
 *   instead (revealing the AgentConstellation agent dots clustered inside it, Seção
 *   "agarrar sinapse"), and only falls back to the normal orb-grab/rotate when it
 *   doesn't land near a node. Still one gesture, no new pose binding — the orb surface
 *   just has two different things to land a pinch on now.
 * - THUMBS_UP/THUMBS_DOWN: already CONFIRM/CANCEL (airGestures.ts, RadialMenu's sensitive-
 *   action gate).
 * - OPEN_PALM: circular-motion spin starts from an open hand held loosely — binding an
 *   edge-triggered action to OPEN_PALM's appearance would fire right as the user opens
 *   their hand to start spinning the orb.
 * - POINTING/FINGER_GUN: reserved as the "isso/aquilo" pointing-direction primitive
 *   (useGlobalVoiceAgent.ts) — an action bound here would fire every time the user points
 *   at something on screen to ask Aurora about it.
 * - PEACE: a quick pinch-tap on the orb already toggles chat (SphereScene.tsx) — binding
 *   PEACE too would mean two unrelated gestures doing the exact same thing.
 * - ROCK: a clap already opens the debug panel (gestureCombos.ts/ClapDetector) — same
 *   reasoning, one canonical gesture per action beats two competing ones.
 * - THREE_FINGERS: no default binding felt like a real mnemonic rather than an arbitrary
 *   assignment — left free for a custom-recorded gesture instead.
 *
 * Toggle for the whole layer lives on visionSlice (builtInGestureShortcutsEnabled) and in
 * Configurações — a user who finds one binding surprising can turn all of them off at once.
 */
export const BUILT_IN_GESTURE_BINDINGS: Partial<Record<PoseName, CustomGestureActionId>> = {
  CLOSED_FIST: "interrupt-speech",
  CALL: "toggle-cinematic",
  FOUR_FINGERS: "toggle-pointer-mode",
};
