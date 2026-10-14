import type { DataStatus } from "@jarvis/shared";

const STATUS_META: Record<DataStatus, { label: string; color: string }> = {
  live: { label: "ao vivo", color: "bg-jarvis-green" },
  stale: { label: "desatualizado", color: "bg-jarvis-amber" },
  error: { label: "erro", color: "bg-jarvis-red" },
  unavailable: { label: "não conectado", color: "bg-white/30" },
};

export function DataStateBadge({ status, lastUpdated }: { status: DataStatus; lastUpdated: string | null }) {
  const meta = STATUS_META[status];
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-white/50" title={lastUpdated ?? undefined}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.color}`} />
      {meta.label}
      {lastUpdated && status !== "unavailable" && (
        <span className="text-white/30">· {new Date(lastUpdated).toLocaleTimeString("pt-BR")}</span>
      )}
    </span>
  );
}
