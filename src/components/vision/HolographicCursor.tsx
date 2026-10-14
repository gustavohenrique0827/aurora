import { useEffect, useState } from "react";
import { useJarvisStore } from "../../state/store";

interface HolographicCursorProps {
  /** If true, uses the homography-transformed projector coordinates instead of screen pixels */
  projectorMode?: boolean;
}

export function HolographicCursor({ projectorMode = false }: HolographicCursorProps) {
  const pointerModeEnabled = useJarvisStore((s) => s.pointerModeEnabled);
  const pointerPosition = useJarvisStore((s) => s.pointerPosition);
  const projectorPointerPosition = useJarvisStore((s) => s.projectorPointerPosition);
  const dominantHand = useJarvisStore((s) => s.dominantHand);
  const hand = useJarvisStore((s) => s.hands[dominantHand]);

  const [clickPulses, setClickPulses] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const pinchActive = hand?.pinch.active ?? false;
  const isPointing = hand?.pose.pose === "POINTING" || hand?.pose.pose === "FINGER_GUN";
  const handConfidence = hand?.pose.confidence ?? 0;

  // Track clicks to trigger holographic pulse ripples
  useEffect(() => {
    if (hand?.gestureEvent?.type === "CLICK" || hand?.gestureEvent?.type === "DOUBLE_CLICK") {
      const now = Date.now();
      const x = projectorMode
        ? (projectorPointerPosition?.x ?? 0.5) * window.innerWidth
        : (pointerPosition?.x ?? 0);
      const y = projectorMode
        ? (projectorPointerPosition?.y ?? 0.5) * window.innerHeight
        : (pointerPosition?.y ?? 0);

      setClickPulses((prev) => [...prev.slice(-4), { id: now, x, y }]);
      setTimeout(() => {
        setClickPulses((prev) => prev.filter((p) => p.id !== now));
      }, 600);
    }
  }, [hand?.gestureEvent, projectorMode, pointerPosition, projectorPointerPosition]);

  if (!pointerModeEnabled) return null;

  let posX = 0;
  let posY = 0;

  if (projectorMode) {
    if (!projectorPointerPosition) return null;
    posX = projectorPointerPosition.x * window.innerWidth;
    posY = projectorPointerPosition.y * window.innerHeight;
  } else {
    if (!pointerPosition) return null;
    posX = pointerPosition.x;
    posY = pointerPosition.y;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Click shockwave pulses */}
      {clickPulses.map((p) => (
        <div
          key={p.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-jarvis-accentBright bg-jarvis-accent/30"
          style={{ left: p.x, top: p.y, width: 48, height: 48 }}
        />
      ))}

      {/* Main Holographic Reticle */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
        style={{ left: posX, top: posY }}
      >
        {/* Outer Rotating Energy Ring */}
        <div
          className={`relative flex items-center justify-center rounded-full border transition-all duration-150 ${
            pinchActive
              ? "h-12 w-12 scale-75 border-jarvis-accentBright bg-jarvis-accentBright/25 shadow-[0_0_20px_rgba(255,122,26,0.1)]"
              : isPointing
                ? "h-10 w-10 scale-100 border-jarvis-accent/90 bg-jarvis-accent/10 shadow-[0_0_12px_rgba(255,122,26,0.12)]"
                : "h-8 w-8 scale-90 border-white/40 bg-white/5"
          }`}
        >
          {/* Cyber crosshairs */}
          <div className="absolute -top-1 h-2 w-[1px] bg-jarvis-accentBright" />
          <div className="absolute -bottom-1 h-2 w-[1px] bg-jarvis-accentBright" />
          <div className="absolute -left-1 h-[1px] w-2 bg-jarvis-accentBright" />
          <div className="absolute -right-1 h-[1px] w-2 bg-jarvis-accentBright" />

          {/* Center pinpoint core */}
          <div
            className={`h-2 w-2 rounded-full transition-all duration-100 ${
              pinchActive
                ? "scale-125 bg-white shadow-[0_0_8px_#ffffff]"
                : "scale-100 bg-jarvis-accentBright shadow-[0_0_5px_#ff7a1a]"
            }`}
          />
        </div>

        {/* Sci-Fi HUD Coordinates Tag */}
        <div className="absolute left-8 top-2 flex flex-col gap-0.5 whitespace-nowrap font-mono text-[9px] text-jarvis-accentBright/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-jarvis-accentBright animate-pulse" />
            <span>
              X: {Math.round(posX)} Y: {Math.round(posY)}
            </span>
          </div>
          {pinchActive && <span className="text-[8px] font-bold tracking-wider text-white">PINCH [ATIVO]</span>}
        </div>
      </div>
    </div>
  );
}

