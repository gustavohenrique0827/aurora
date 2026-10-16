import { useMemo } from "react";

/** Small seeded PRNG so the decorative layout is stable between renders. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

interface Stream {
  y: number;
  x1: number;
  x2: number;
  node: number | null;
  delay: number;
}

function makeStreams(seed: number, side: "left" | "right", count: number): Stream[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    const len = 90 + r() * 330;
    const edge = side === "left" ? 0 : 1000;
    const x1 = side === "left" ? edge : edge - len;
    const x2 = side === "left" ? edge + len : edge;
    return { y: 40 + r() * 920, x1, x2, node: r() > 0.45 ? (side === "left" ? x2 : x1) : null, delay: r() * 4 };
  });
}

/**
 * Decorative holographic set for the immersive Aurora view: ember glow, data streams with nodes,
 * abstract panels (line blocks, not text), halo rings above the head and a perspective grid floor.
 * Pure CSS/SVG, no data, pointer-events-none.
 */
export function AuroraBackdrop() {
  const left = useMemo(() => makeStreams(7, "left", 22), []);
  const right = useMemo(() => makeStreams(19, "right", 14), []);
  const panels = useMemo(() => {
    const r = rng(41);
    return [
      { x: "22%", y: "24%", w: 150, h: 130 },
      { x: "20%", y: "58%", w: 170, h: 150 },
      { x: "63%", y: "30%", w: 130, h: 160 },
      { x: "66%", y: "62%", w: 150, h: 120 },
    ].map((p) => ({ ...p, bars: Array.from({ length: 11 }, () => 25 + r() * 70) }));
  }, []);

  const glow = "rgba(255,122,26,";

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050403]">
      {/* Ember glow behind the head and along the floor */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(ellipse 38% 55% at 50% 42%, ${glow}0.34), transparent 70%),` +
            `radial-gradient(ellipse 70% 30% at 50% 100%, ${glow}0.30), transparent 70%),` +
            `radial-gradient(ellipse 30% 40% at 8% 35%, ${glow}0.18), transparent 70%)`,
        }}
      />

      {/* Data streams */}
      <svg className="absolute inset-y-0 left-0 h-full w-[46%]" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        {left.map((s, i) => (
          <g key={i} className="animate-pulseGlow" style={{ animationDelay: `${s.delay}s` }}>
            <line x1={s.x1} y1={s.y} x2={s.x2} y2={s.y} stroke="#ff8a2e" strokeOpacity="0.55" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            {s.node !== null && <circle cx={s.node} cy={s.y} r="7" fill="none" stroke="#ffa24d" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
          </g>
        ))}
      </svg>
      <svg className="absolute inset-y-0 right-0 h-full w-[36%]" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        {right.map((s, i) => (
          <g key={i} className="animate-pulseGlow" style={{ animationDelay: `${s.delay}s` }}>
            <line x1={s.x1} y1={s.y} x2={s.x2} y2={s.y} stroke="#ff8a2e" strokeOpacity="0.4" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            {s.node !== null && <circle cx={s.node} cy={s.y} r="7" fill="none" stroke="#ffa24d" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
          </g>
        ))}
      </svg>

      {/* Abstract panels */}
      {panels.map((p, i) => (
        <div
          key={i}
          className="absolute hidden rounded-sm border border-jarvis-accent/35 bg-jarvis-accent/[0.04] p-2 lg:block"
          style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
        >
          {p.bars.map((w, k) => (
            <div key={k} className="mb-[5px] h-[2px] rounded-full bg-jarvis-accent/45" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}

      {/* Halo rings above the head */}
      <div className="absolute left-1/2 top-[-6%] h-[18%] w-[min(52%,620px)] -translate-x-1/2">
        <div className="absolute inset-0 rounded-[50%] border border-jarvis-accentBright/70 shadow-[0_0_30px_rgba(255,122,26,0.55)]" />
        <div className="absolute inset-[18%] rounded-[50%] border border-jarvis-accent/60" />
        <div className="absolute inset-[34%] rounded-[50%] border border-jarvis-accentBright/50" />
      </div>

      {/* Perspective grid floor */}
      <div
        className="absolute inset-x-[-20%] bottom-0 h-[34%] origin-bottom"
        style={{
          transform: "perspective(500px) rotateX(58deg)",
          backgroundImage:
            "linear-gradient(rgba(255,138,46,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,138,46,0.55) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(to top, black 10%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 95%)",
        }}
      />
    </div>
  );
}
