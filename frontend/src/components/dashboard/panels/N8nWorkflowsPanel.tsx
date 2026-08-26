import type { DataState, N8nSnapshot } from "@jarvis/shared";
import { GlassPanel } from "../../common/GlassPanel";
import { DataStateBadge } from "../DataStateBadge";
import { NotConnectedPanel } from "./NotConnectedPanel";

export function N8nWorkflowsPanel({ state }: { state: DataState<N8nSnapshot> }) {
  return (
    <GlassPanel title="Workflows (n8n)" action={<DataStateBadge status={state.status} lastUpdated={state.lastUpdated} />}>
      {!state.data ? (
        <NotConnectedPanel reason={state.error ?? "Sem credencial de API do n8n configurada"} />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-4 text-2xl font-semibold">
            <div>
              <span className="text-jarvis-green">{state.data.activeCount}</span>
              <div className="text-[10px] font-normal uppercase tracking-wider text-white/40">ativos</div>
            </div>
            <div>
              <span className="text-white/40">{state.data.inactiveCount}</span>
              <div className="text-[10px] font-normal uppercase tracking-wider text-white/40">inativos</div>
            </div>
          </div>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
            {state.data.workflows.slice(0, 8).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 text-white/70">
                <span className="truncate">{w.name.replace("[G-TECH AI OS] ", "")}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] ${
                    w.active ? "bg-jarvis-green/15 text-jarvis-green" : "bg-white/5 text-white/30"
                  }`}
                >
                  {w.active ? "ativo" : "inativo"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassPanel>
  );
}
