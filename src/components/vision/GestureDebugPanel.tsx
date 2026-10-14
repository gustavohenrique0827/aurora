import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useJarvisStore } from "../../state/store";
import type { AirGestureEvent, HandFrame, HandSide } from "../../lib/handTracking/types";

const RECENT_EVENT_DISPLAY_MS = 1200;

function formatGestureEvent(event: AirGestureEvent): string {
  switch (event.type) {
    case "DRAG_MOVE":
      return "DRAG_MOVE";
    case "SCROLL":
      return `SCROLL (${event.delta > 0 ? "↑" : "↓"} ${Math.abs(event.delta).toFixed(1)})`;
    default:
      return event.type;
  }
}

const CANVAS_W = 240;
const CANVAS_H = 180;

// What each implemented gesture actually does — kept in sync with the real wiring
// (SphereScene.tsx, usePointerMode.ts, useGestureCombos.ts, useCustomGestureActions.ts,
// useBuiltInGestureActions.ts), not an aspirational list. Shown fixed alongside the
// skeleton so it's readable without having to remember the mapping.
const GESTURE_LEGEND: { gesture: string; action: string }[] = [
  { gesture: "Pinch + mover (1 mão) sobre o orbe", action: "Agarra e gira o orbe" },
  { gesture: "Pinch numa sinapse (pontinho da malha)", action: "Abre a sinapse e revela os agentes dentro dela" },
  { gesture: "Pinch com as 2 mãos", action: "Zoom (escala) e giro do orbe" },
  { gesture: "Pinch rápido (toque) no orbe", action: "Abre/fecha o chat" },
  { gesture: "Segurar pinch no orbe", action: "Abre o menu radial" },
  { gesture: "Mão aberta girando em círculo", action: "Gira o orbe livremente" },
  { gesture: "Bater palma", action: "Abre este painel" },
  { gesture: "Punho fechado (✊)", action: "Interrompe a fala da Aurora" },
  { gesture: "Sinal de ligar (🤙)", action: "Ativa/desativa Modo Cinematic" },
  { gesture: "4 dedos, polegar dobrado", action: "Ativa/desativa Modo Ponteiro" },
  { gesture: "Modo Ponteiro (Configurações)", action: "Indicador vira cursor real" },
  { gesture: "Gesto personalizado (Configurações)", action: "Ação que você configurou" },
];

// 21-point connectivity for drawing the hand skeleton (Seção 45).
const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17],
];

function drawHand(ctx: CanvasRenderingContext2D, hand: HandFrame, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  for (const [a, b] of CONNECTIONS) {
    const pa = hand.landmarks[a];
    const pb = hand.landmarks[b];
    ctx.beginPath();
    // Mirror x so the overlay matches a natural "look in the mirror" self-view.
    ctx.moveTo((1 - pa.x) * CANVAS_W, pa.y * CANVAS_H);
    ctx.lineTo((1 - pb.x) * CANVAS_W, pb.y * CANVAS_H);
    ctx.stroke();
  }
  for (const p of hand.landmarks) {
    ctx.beginPath();
    ctx.arc((1 - p.x) * CANVAS_W, p.y * CANVAS_H, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function HandReadout({
  side,
  hand,
  dominantHand,
  recentEvent,
}: {
  side: HandSide;
  hand: HandFrame | undefined;
  dominantHand: HandSide;
  recentEvent: string | null;
}) {
  return (
    <div className="flex-1 font-mono text-[10px] leading-relaxed text-white/70">
      <div className="mb-0.5 uppercase tracking-wider text-white/40">
        {side === "left" ? "Esquerda" : "Direita"} · {side === dominantHand ? "dominante" : "apoio"}
      </div>
      {hand ? (
        <>
          <div>pose: {hand.pose.pose} ({hand.pose.confidence.toFixed(2)})</div>
          <div>handedness: {hand.handednessConfidence.toFixed(2)}</div>
          <div>pinch: {hand.pinch.active ? "ATIVO" : "—"} ({hand.pinch.distanceRatio.toFixed(2)})</div>
          {hand.circularMotion.active && (
            <div>
              rotação: {hand.circularMotion.direction} ({hand.circularMotion.angularVelocity.toFixed(1)} rad/s)
            </div>
          )}
          {hand.pointingDirection && (
            <div>
              direção: ({hand.pointingDirection.x.toFixed(2)}, {hand.pointingDirection.y.toFixed(2)})
            </div>
          )}
          <div>vel: {hand.velocity.toFixed(2)}/s</div>
          {recentEvent && <div className="text-jarvis-cyanBright">gesto: {recentEvent}</div>}
        </>
      ) : (
        <div className="text-white/25">não detectada</div>
      )}
    </div>
  );
}

/**
 * Debug-only overlay (Seções 44/45) — off unless Debug Mode is explicitly on. Draws the
 * 21-landmark skeleton for both hands on a small canvas and a live readout of pose/
 * confidence/pinch/velocity. Reads the video element from the SAME engine instance
 * mounted in AppShell (never opens a second camera stream).
 */
export function GestureDebugPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const setDebugMode = useJarvisStore((s) => s.setDebugMode);
  const handLostWarning = useJarvisStore((s) => s.handLostWarning);
  // Air-gesture events (Lote 4) are edge-triggered pulses — present on a HandFrame for a
  // single frame — so they're latched here for a moment, otherwise a CLICK/SWIPE would be
  // impossible to actually read before it vanished.
  const [recentEvent, setRecentEvent] = useState<Record<HandSide, string | null>>({ left: null, right: null });
  const lastEventTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });
  const clearTimersRef = useRef<Record<HandSide, ReturnType<typeof setTimeout> | null>>({ left: null, right: null });

  useEffect(() => {
    const tick = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const hands = useJarvisStore.getState().hands;
      if (canvas && ctx) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "rgba(79, 215, 255, 0.05)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        if (hands.left) drawHand(ctx, hands.left, "#8ff3ff");
        if (hands.right) drawHand(ctx, hands.right, "#5cffb0");
      }
      (["left", "right"] as HandSide[]).forEach((side) => {
        const hand = hands[side];
        if (!hand?.gestureEvent || hand.timestamp === lastEventTsRef.current[side]) return;
        lastEventTsRef.current[side] = hand.timestamp;
        const label = formatGestureEvent(hand.gestureEvent);
        setRecentEvent((prev) => ({ ...prev, [side]: label }));
        const existingTimer = clearTimersRef.current[side];
        if (existingTimer) clearTimeout(existingTimer);
        clearTimersRef.current[side] = setTimeout(() => {
          setRecentEvent((prev) => ({ ...prev, [side]: null }));
        }, RECENT_EVENT_DISPLAY_MS);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      (["left", "right"] as HandSide[]).forEach((side) => {
        const timer = clearTimersRef.current[side];
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const hands = useJarvisStore((s) => s.hands);
  const dominantHand = useJarvisStore((s) => s.dominantHand);
  const gestureHistory = useJarvisStore((s) => s.gestureHistory);
  const trackingFps = useJarvisStore((s) => s.trackingFps);
  const detectionLatencyMs = useJarvisStore((s) => s.detectionLatencyMs);
  const renderQuality = useJarvisStore((s) => s.renderQuality);
  // CommsDock is itself fixed-to-the-right (and 384px wide) above the lg breakpoint — this
  // panel shifts left of it instead of overlapping when the chat is open, rather than
  // fighting it for the same strip of screen.
  const commsDockOpen = useJarvisStore((s) => s.commsDockOpen);

  return (
    <div
      className={`fixed top-20 z-40 max-h-[calc(100vh-6rem)] w-[280px] overflow-y-auto rounded-xl border border-jarvis-border bg-jarvis-bg/90 p-3 backdrop-blur-md ${
        commsDockOpen ? "right-4 lg:right-[404px]" : "right-4"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Gesture Debug</span>
        <button type="button" onClick={() => setDebugMode(false)} className="text-white/30 hover:text-white/70">
          <X size={13} />
        </button>
      </div>
      {/* Monitoramento de performance (Seção 59/60) — FPS do loop de rastreamento,
          latência do último detectForVideo(), e a tier de qualidade de render que
          EnergySphere aplicou (Seção 59/FpsWatcher). */}
      <div className="mb-2 flex items-center justify-between font-mono text-[9px] text-white/35">
        <span>{trackingFps.toFixed(0)} fps</span>
        <span>{detectionLatencyMs.toFixed(1)} ms</span>
        <span className={renderQuality === "low" ? "text-jarvis-amber" : ""}>
          render: {renderQuality === "low" ? "baixa" : "alta"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="mb-2 w-full rounded-lg border border-jarvis-border/60 bg-black/40"
      />
      {handLostWarning && (
        <div className="mb-2 text-[10px] text-jarvis-amber">Não consegui detectar sua mão.</div>
      )}
      <div className="flex gap-3">
        <HandReadout side="left" hand={hands.left} dominantHand={dominantHand} recentEvent={recentEvent.left} />
        <HandReadout side="right" hand={hands.right} dominantHand={dominantHand} recentEvent={recentEvent.right} />
      </div>

      {gestureHistory.length > 0 && (
        <div className="mt-2.5 border-t border-jarvis-border/60 pt-2">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/30">Histórico</div>
          <ul className="max-h-24 space-y-0.5 overflow-y-auto font-mono text-[10px] text-white/50">
            {gestureHistory.map((entry) => (
              <li key={entry.id}>
                <span className={entry.side === "left" ? "text-jarvis-cyan" : "text-jarvis-green"}>
                  {entry.side === "left" ? "E" : "D"}
                </span>{" "}
                {entry.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2.5 border-t border-jarvis-border/60 pt-2">
        <div className="mb-1 text-[10px] uppercase tracking-widest text-white/30">O que cada gesto faz</div>
        <ul className="space-y-1 text-[10px] leading-snug text-white/50">
          {GESTURE_LEGEND.map((item) => (
            <li key={item.gesture} className="flex justify-between gap-2">
              <span className="text-white/60">{item.gesture}</span>
              <span className="shrink-0 text-right text-white/35">{item.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
