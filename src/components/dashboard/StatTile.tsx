import type { LucideIcon } from "lucide-react";
import type { DataStatus } from "@jarvis/shared";
import { Link } from "react-router-dom";

interface StatTileProps {
  label: string;
  icon: LucideIcon;
  value: string | number | null;
  status: DataStatus;
  hint?: string;
  href?: string;
}

const STATUS_GLOW: Record<DataStatus, string> = {
  live: "border-jarvis-border hover:border-jarvis-accent/50 hover:shadow-[0_0_20px_rgba(255,122,26,0.1)]",
  stale: "border-jarvis-amber/30 hover:border-jarvis-amber/60 hover:shadow-[0_0_20px_rgba(255,180,84,0.2)]",
  error: "border-jarvis-red/30 hover:border-jarvis-red/60 hover:shadow-[0_0_20px_rgba(255,92,122,0.2)]",
  unavailable: "border-white/10 hover:border-white/20",
};

export function StatTile({ label, icon: Icon, value, status, hint, href }: StatTileProps) {
  const hasValue = (status === "live" || status === "stale") && value !== null;
  const isStringValue = typeof value === "string";

  const content = (
    <div
      className={`group relative flex h-[124px] flex-col justify-between overflow-hidden rounded-2xl border bg-[#101114]/80 p-3.5 backdrop-blur-xl transition-all duration-200 ${STATUS_GLOW[status]}`}
    >
      {/* Top Header Row: Icon & Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white/50 transition-colors group-hover:border-jarvis-accent/40 group-hover:text-jarvis-accentBright">
          <Icon size={14} strokeWidth={2} />
        </div>

        <div className="flex items-center gap-1.5">
          {hint && (
            <span className="hidden font-mono text-[9px] text-white/30 sm:inline">
              {hint}
            </span>
          )}
          {status === "live" && (
            <span
              className="h-2 w-2 rounded-full bg-jarvis-green shadow-[0_0_6px_#4ade80]"
              title="Conectado ao vivo"
            />
          )}
          {status === "stale" && (
            <span
              className="h-2 w-2 rounded-full bg-jarvis-amber shadow-[0_0_8px_#ffb454]"
              title="Dado desatualizado"
            />
          )}
          {status === "error" && (
            <span
              className="h-2 w-2 rounded-full bg-jarvis-red shadow-[0_0_8px_#ff5c7a]"
              title="Falha de conexão"
            />
          )}
          {status === "unavailable" && (
            <span className="h-2 w-2 rounded-full bg-white/20" title="Indisponível" />
          )}
        </div>
      </div>

      {/* Middle: Value (Consistent baseline) */}
      <div className="flex items-baseline">
        {hasValue ? (
          isStringValue ? (
            <span className="font-display text-xl font-semibold tracking-tight text-jarvis-green group-hover:brightness-125 transition-all">
              {value}
            </span>
          ) : (
            <span className="font-display text-3xl font-semibold tracking-tight text-white group-hover:text-jarvis-accentBright transition-colors">
              {value}
            </span>
          )
        ) : (
          <span className="font-mono text-xs font-semibold uppercase text-white/30">
            {status === "error" ? "erro" : "offline"}
          </span>
        )}
      </div>

      {/* Bottom: Label */}
      <div className="truncate text-[11px] font-medium tracking-wide text-white/50 group-hover:text-white/80 transition-colors">
        {label}
      </div>

    </div>
  );

  return href ? (
    <Link to={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
