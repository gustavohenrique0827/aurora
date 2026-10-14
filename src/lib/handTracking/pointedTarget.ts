import { mapHandToScreen, type PointerCalibration } from "./calibration";

const MAX_LABEL_LENGTH = 60;

export interface PointedTargetResult {
  label: string;
  x: number;
  y: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

/**
 * Resolves what's under the index fingertip on screen into a structured label and bounding box.
 * Reads real DOM structure (data-gesture-label, aria-label, title, text).
 */
export function resolvePointedTarget(
  indexTipX: number,
  indexTipY: number,
  calibration: PointerCalibration
): PointedTargetResult | null {
  if (typeof document === "undefined") return null;

  const pos = mapHandToScreen(indexTipX, indexTipY, calibration, window.innerWidth, window.innerHeight);
  const el = document.elementFromPoint(pos.x, pos.y);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const bounds = {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };

  if (el.tagName === "CANVAS" || el.closest("canvas")) {
    return { label: "o núcleo da Aurora", x: pos.x, y: pos.y, bounds };
  }

  const labeled = el.closest("[data-gesture-label]");
  if (labeled) {
    const lRect = labeled.getBoundingClientRect();
    return {
      label: labeled.getAttribute("data-gesture-label") || "Elemento Selecionado",
      x: pos.x,
      y: pos.y,
      bounds: { x: lRect.left, y: lRect.top, width: lRect.width, height: lRect.height },
    };
  }

  const ariaEl = el.closest("[aria-label]");
  if (ariaEl) {
    return {
      label: ariaEl.getAttribute("aria-label") || "Elemento",
      x: pos.x,
      y: pos.y,
      bounds,
    };
  }

  const titled = el.closest("[title]");
  if (titled) {
    return {
      label: titled.getAttribute("title") || "Elemento",
      x: pos.x,
      y: pos.y,
      bounds,
    };
  }

  const text = el.textContent?.trim();
  if (text) {
    const label = text.length > MAX_LABEL_LENGTH ? `${text.slice(0, MAX_LABEL_LENGTH)}...` : text;
    return { label, x: pos.x, y: pos.y, bounds };
  }

  return null;
}
