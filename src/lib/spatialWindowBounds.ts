/**
 * Shared viewport clamp for spatial-window dragging — used by both the mouse/touch
 * pointer drag (SpatialWindowManager's header) and the pinch-drag (useSpatialWindows,
 * hand-gesture grab). Keeps at least a corner of the window on screen so a drag can
 * never push it fully off-screen and make it unreachable either way.
 */
const MIN_X = 10;
const MIN_Y = 50;
const MIN_VISIBLE_WIDTH_PX = 160;
const MIN_VISIBLE_HEADER_PX = 44;

export function clampWindowPosition(x: number, y: number, width: number): { x: number; y: number } {
  const maxX = Math.max(MIN_X, window.innerWidth - Math.min(width, MIN_VISIBLE_WIDTH_PX));
  const maxY = Math.max(MIN_Y, window.innerHeight - MIN_VISIBLE_HEADER_PX);
  return {
    x: Math.min(Math.max(MIN_X, x), maxX),
    y: Math.min(Math.max(MIN_Y, y), maxY),
  };
}
