import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJarvisStore } from "../../state/store";
import { mapHandToScreen } from "../../lib/handTracking/calibration";
import { api } from "../../lib/api";
import type { HandSide } from "../../lib/handTracking/types";

const MIN_RADIUS_PX = 40; // how far the hand must drift from center before a slice highlights
const RADIUS_PX = 90;
const CONFIRM_TIMEOUT_MS = 6000;

interface MenuItem {
  label: string;
  angle: number; // atan2 convention: 0 = right, π/2 = down, ±π = left, -π/2 = up
  sensitive?: boolean;
  run: () => void;
}

/**
 * The radial menu (Seção 33) opens when SphereScene detects a held pinch on the orb
 * (HOLD_START, see there) and closes itself here. While open, moving the SAME still-
 * pinched hand picks a slice by direction; releasing (HOLD_END) confirms the highlighted
 * one. Three items are safe, reversible toggles that execute immediately. The fourth
 * ("Sair") is genuinely sensitive — Seção 48 requires it NOT fire on selection alone, so
 * it instead arms a confirmation prompt that only resolves on an explicit CONFIRM
 * (THUMBS_UP) or CANCEL (THUMBS_DOWN) gesture, or times out to a safe no-op.
 */
export function RadialMenu() {
  const radialMenuOpen = useJarvisStore((s) => s.radialMenuOpen);
  const radialMenuCenter = useJarvisStore((s) => s.radialMenuCenter);
  const radialMenuHand = useJarvisStore((s) => s.radialMenuHand);
  const setRadialMenuOpen = useJarvisStore((s) => s.setRadialMenuOpen);
  const setRadialMenuHand = useJarvisStore((s) => s.setRadialMenuHand);
  const toggleCommsDock = useJarvisStore((s) => s.toggleCommsDock);
  const debugMode = useJarvisStore((s) => s.debugMode);
  const setDebugMode = useJarvisStore((s) => s.setDebugMode);
  const setPrivacyMode = useJarvisStore((s) => s.setPrivacyMode);
  const setAuthenticated = useJarvisStore((s) => s.setAuthenticated);
  const navigate = useNavigate();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<MenuItem | null>(null);
  const selectedIndexRef = useRef<number | null>(null);
  const lastHoldEndTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });
  const lastConfirmEventTsRef = useRef<Record<HandSide, number>>({ left: 0, right: 0 });

  const items = useMemo<MenuItem[]>(
    () => [
      { label: "Chat", angle: -Math.PI / 2, run: () => toggleCommsDock() },
      { label: "Privacidade", angle: 0, run: () => setPrivacyMode(true) },
      { label: "Debug", angle: Math.PI / 2, run: () => setDebugMode(!debugMode) },
      {
        label: "Sair",
        angle: Math.PI,
        sensitive: true,
        run: () => {
          api.logout().catch(() => undefined);
          setAuthenticated(false);
          navigate("/login");
        },
      },
    ],
    [toggleCommsDock, setPrivacyMode, setDebugMode, debugMode, setAuthenticated, navigate]
  );

  const close = useCallback(() => {
    setRadialMenuOpen(false);
    setRadialMenuHand(null);
    setConfirmingItem(null);
    setSelectedIndex(null);
    selectedIndexRef.current = null;
  }, [setRadialMenuOpen, setRadialMenuHand]);

  // Direction tracking + selection — active while open and not yet confirming.
  useEffect(() => {
    if (!radialMenuOpen || confirmingItem || !radialMenuHand) return;
    let raf: number;
    const tick = () => {
      const state = useJarvisStore.getState();
      const center = state.radialMenuCenter;
      const hand = state.hands[radialMenuHand];
      if (!hand || !center) {
        close(); // hand lost mid-menu — nothing meaningful to keep open for
        return;
      }

      const screenPos = mapHandToScreen(
        hand.pinch.position.x,
        hand.pinch.position.y,
        state.pointerCalibration,
        window.innerWidth,
        window.innerHeight
      );
      const dx = screenPos.x - center.x;
      const dy = screenPos.y - center.y;
      if (Math.hypot(dx, dy) > MIN_RADIUS_PX) {
        const angle = Math.atan2(dy, dx);
        let best = 0;
        let bestDiff = Infinity;
        items.forEach((item, i) => {
          const diff = Math.abs(Math.atan2(Math.sin(angle - item.angle), Math.cos(angle - item.angle)));
          if (diff < bestDiff) {
            bestDiff = diff;
            best = i;
          }
        });
        selectedIndexRef.current = best;
        setSelectedIndex(best);
      } else {
        selectedIndexRef.current = null;
        setSelectedIndex(null);
      }

      if (hand.gestureEvent?.type === "HOLD_END" && hand.timestamp !== lastHoldEndTsRef.current[radialMenuHand]) {
        lastHoldEndTsRef.current[radialMenuHand] = hand.timestamp;
        const idx = selectedIndexRef.current;
        if (idx === null) {
          close(); // released near center — no direction chosen, treat as a plain cancel
        } else {
          const item = items[idx];
          if (item.sensitive) {
            setConfirmingItem(item);
          } else {
            item.run();
            close();
          }
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [radialMenuOpen, radialMenuHand, confirmingItem, items, close]);

  // Confirmation gate (Seção 48) — by the time this runs, the menu-opening pinch has
  // already released (HOLD_END fired above), so either hand is free to show THUMBS_UP/
  // THUMBS_DOWN. Times out to a safe no-op rather than staying armed indefinitely.
  useEffect(() => {
    if (!confirmingItem) return;
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    let raf: number;
    const tick = () => {
      const hands = useJarvisStore.getState().hands;
      for (const side of ["right", "left"] as HandSide[]) {
        const hand = hands[side];
        if (!hand?.gestureEvent || hand.timestamp === lastConfirmEventTsRef.current[side]) continue;
        if (hand.gestureEvent.type === "CONFIRM") {
          lastConfirmEventTsRef.current[side] = hand.timestamp;
          confirmingItem.run();
          close();
          return;
        }
        if (hand.gestureEvent.type === "CANCEL") {
          lastConfirmEventTsRef.current[side] = hand.timestamp;
          close();
          return;
        }
      }
      if (Date.now() > deadline) {
        close();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [confirmingItem, close]);

  if (!radialMenuOpen || !radialMenuCenter) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[110]">
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-jarvis-accent/30 bg-jarvis-bg/40 backdrop-blur-sm"
        style={{
          left: radialMenuCenter.x,
          top: radialMenuCenter.y,
          width: RADIUS_PX * 2 + 44,
          height: RADIUS_PX * 2 + 44,
        }}
      />

      {!confirmingItem &&
        items.map((item, i) => {
          const x = radialMenuCenter.x + Math.cos(item.angle) * RADIUS_PX;
          const y = radialMenuCenter.y + Math.sin(item.angle) * RADIUS_PX;
          const active = selectedIndex === i;
          return (
            <div
              key={item.label}
              className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-100 ${
                active
                  ? "scale-110 border-jarvis-accentBright bg-jarvis-accentBright/20 text-jarvis-accentBright"
                  : item.sensitive
                    ? "border-jarvis-red/40 bg-jarvis-bg/85 text-jarvis-red/80"
                    : "border-jarvis-border bg-jarvis-bg/85 text-white/60"
              }`}
              style={{ left: x, top: y }}
            >
              {item.label}
            </div>
          );
        })}

      {confirmingItem && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border border-jarvis-amber/50 bg-jarvis-bg/95 px-4 py-3 text-center text-xs"
          style={{ left: radialMenuCenter.x, top: radialMenuCenter.y }}
        >
          <div className="mb-1 text-white/80">Confirmar "{confirmingItem.label}"?</div>
          <div className="text-white/40">👍 confirmar · 👎 cancelar</div>
        </div>
      )}
    </div>
  );
}
