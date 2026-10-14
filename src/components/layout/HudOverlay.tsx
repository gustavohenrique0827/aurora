/**
 * Ambient background chrome: a barely-there grid for depth. Absolute and pointer-events-none, so it
 * never blocks interaction. (Scanline sweep and corner brackets were removed — decorative motion
 * competed with the data.)
 */
export function HudOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  );
}
