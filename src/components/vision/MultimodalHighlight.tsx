import { useJarvisStore } from "../../state/store";

export function MultimodalHighlight() {
  const multimodalTarget = useJarvisStore((s) => s.multimodalTarget);

  if (!multimodalTarget) return null;

  const { label, x, y, bounds } = multimodalTarget;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998]">
      {bounds ? (
        <div
          style={{
            left: bounds.x - 6,
            top: bounds.y - 6,
            width: bounds.width + 12,
            height: bounds.height + 12,
          }}
          className="absolute rounded-xl border-2 border-jarvis-accentBright bg-jarvis-accent/15 shadow-[0_0_30px_rgba(255,122,26,0.1)] animate-pulse"
        >
          {/* Target Label */}
          <div className="absolute -top-7 left-2 flex items-center gap-1.5 rounded-md bg-black/90 px-2 py-0.5 font-mono text-[10px] font-bold text-jarvis-accentBright border border-jarvis-accent/50">
            <span className="h-1.5 w-1.5 rounded-full bg-jarvis-accentBright animate-ping" />
            <span>ALVO MULTIMODAL: {label}</span>
          </div>
        </div>
      ) : (
        <div
          style={{ left: x, top: y }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-jarvis-accentBright animate-spin">
            <div className="h-4 w-4 rounded-full bg-jarvis-accentBright shadow-[0_0_15px_#ff7a1a]" />
          </div>
          <div className="mt-2 whitespace-nowrap rounded-md bg-black/90 px-2 py-0.5 font-mono text-[10px] font-bold text-jarvis-accentBright border border-jarvis-accent/50">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

