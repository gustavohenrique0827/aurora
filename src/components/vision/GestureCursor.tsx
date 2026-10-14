import { useJarvisStore } from "../../state/store";

/**
 * The visible cursor for pointer mode (usePointerMode.ts) — purely presentational,
 * `pointer-events: none` so it never itself blocks the real DOM clicks it's there to
 * represent. Compresses and brightens while the driving hand is pinching, giving the same
 * "pressed" feedback a mouse cursor gets from `:active` styling.
 */
export function GestureCursor() {
  const pointerModeEnabled = useJarvisStore((s) => s.pointerModeEnabled);
  const pointerPosition = useJarvisStore((s) => s.pointerPosition);
  const dominantHand = useJarvisStore((s) => s.dominantHand);
  const pinchActive = useJarvisStore((s) => s.hands[dominantHand]?.pinch.active ?? false);

  if (!pointerModeEnabled || !pointerPosition) return null;

  return (
    <div
      className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2"
      style={{ left: pointerPosition.x, top: pointerPosition.y }}
    >
      <div
        className={`h-6 w-6 rounded-full border-2 transition-all duration-100 ${
          pinchActive
            ? "scale-75 border-jarvis-accentBright bg-jarvis-accentBright/30"
            : "scale-100 border-jarvis-accent/80 bg-jarvis-accent/10"
        }`}
      />
      <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-jarvis-accentBright" />
    </div>
  );
}
