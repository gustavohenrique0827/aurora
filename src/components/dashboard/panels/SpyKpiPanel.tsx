import type { SpyKpiSnapshot, DataState } from "@jarvis/shared";
import { GlassPanel } from "../../common/GlassPanel";
import { DataStateBadge } from "../DataStateBadge";
import { NotConnectedPanel } from "./NotConnectedPanel";

const TABLE_LABEL: Record<string, string> = {
  leads: "Leads",
  clientes: "Clientes",
  finance_entries: "Financeiro",
  contracts: "Contratos",
  proposals: "Propostas",
  dev_sprint_tasks: "Sprint (dev)",
  dev_projects: "Projetos (dev)",
  dev_issues: "Issues (dev)",
};

export function SpyKpiPanel({ state }: { state: DataState<SpyKpiSnapshot> }) {
  return (
    <GlassPanel title="SPY (CRM/ERP G-TECH)" action={<DataStateBadge status={state.status} lastUpdated={state.lastUpdated} />}>
      {!state.data ? (
        <NotConnectedPanel reason={state.error ?? "Credencial do SPY não configurada"} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {state.data.counts.map((c) => (
              <div key={c.table} className="rounded-lg border border-jarvis-border/60 bg-black/20 px-3 py-2">
                <div className="text-xl font-semibold text-jarvis-cyanBright">{c.count}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">{TABLE_LABEL[c.table] ?? c.table}</div>
              </div>
            ))}
          </div>
          {state.data.recent.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">Recentes</div>
              <ul className="max-h-28 space-y-1 overflow-y-auto text-xs text-white/70">
                {state.data.recent.map((row) => (
                  <li key={`${row.table}-${row.id}`} className="flex justify-between gap-2">
                    <span className="truncate">{row.label}</span>
                    <span className="shrink-0 text-white/30">{TABLE_LABEL[row.table] ?? row.table}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}
