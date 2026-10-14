import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { DirectorMeta } from "@jarvis/shared";

interface DirectorCardProps {
  director: DirectorMeta;
  active?: boolean;
}

export function DirectorCard({ director, active }: DirectorCardProps) {
  return (
    <Link
      to={`/directors/${director.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-jarvis-cyan/15 bg-[#0a0f1d]/75 p-4 backdrop-blur-xl transition-all duration-200 hover:border-jarvis-cyan/50 hover:bg-[#0e162a]/90 hover:shadow-[0_0_20px_rgba(79,215,255,0.18)]"
    >
      {/* Top Header: Avatar & Status Dot */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-jarvis-cyan/30 bg-jarvis-cyan/10 font-mono text-xs font-bold text-jarvis-cyanBright shadow-[0_0_10px_rgba(79,215,255,0.2)] group-hover:scale-105 transition-transform">
          {director.name.slice(0, 2)}
        </div>

        <div className="flex items-center gap-1.5">
          {active !== undefined && (
            <span
              className={`h-2 w-2 rounded-full ${
                active
                  ? "bg-jarvis-green shadow-[0_0_8px_#5cffb0] animate-pulse"
                  : "bg-white/20"
              }`}
              title={active ? "Workflow ativo no n8n" : "Workflow inativo no n8n"}
            />
          )}
          <ArrowUpRight size={14} className="text-white/20 transition-colors group-hover:text-jarvis-cyanBright" />
        </div>
      </div>

      {/* Director Name & Scope */}
      <div>
        <div className="font-display text-sm font-bold text-white group-hover:text-jarvis-cyanBright transition-colors">
          {director.name}
        </div>
        <div className="mt-1 font-mono text-[11px] text-white/40 group-hover:text-white/60 transition-colors">
          {director.title}
        </div>
      </div>

      {/* Cyber Corner Notch */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-jarvis-cyan/30 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
