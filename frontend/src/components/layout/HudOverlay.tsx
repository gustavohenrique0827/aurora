/**
 * Purely decorative HUD chrome — corner brackets, scanline sweep, tech grid.
 * Absolute, pointer-events-none, sits above content but never blocks interaction.
 * This is what pushes the interface from "dark dashboard" toward "cinematic sci-fi UI."
 */
export function HudOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {/* faint tech grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(79,215,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(79,215,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* scanline sweep */}
      <div className="hud-scanline absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-jarvis-cyan/10 to-transparent" />

      {/* corner brackets */}
      <CornerBracket className="left-3 top-3 border-l border-t" />
      <CornerBracket className="right-3 top-3 border-r border-t" />
      <CornerBracket className="bottom-3 left-3 border-b border-l" />
      <CornerBracket className="bottom-3 right-3 border-b border-r" />
    </div>
  );
}

function CornerBracket({ className }: { className: string }) {
  return <div className={`absolute h-6 w-6 border-jarvis-cyan/30 ${className}`} />;
}
