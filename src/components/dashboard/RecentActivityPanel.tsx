import { FileText, FolderKanban, ListChecks, Users, Wallet, type LucideIcon } from "lucide-react";
import type { DataState, SpyKpiSnapshot } from "@jarvis/shared";
import { GlassPanel } from "../common/GlassPanel";
import { DataStateBadge } from "./DataStateBadge";
import { NotConnectedPanel } from "./panels/NotConnectedPanel";
import { timeAgo } from "../../lib/timeAgo";

const TABLE_META: Record<string, { label: string; icon: LucideIcon }> = {
  leads: { label: "Lead", icon: Users },
  clientes: { label: "Cliente", icon: Users },
  finance_entries: { label: "Lançamento", icon: Wallet },
  contracts: { label: "Contrato", icon: FileText },
  proposals: { label: "Proposta", icon: FileText },
  dev_sprint_tasks: { label: "Tarefa de sprint", icon: ListChecks },
  dev_projects: { label: "Projeto", icon: FolderKanban },
  dev_issues: { label: "Issue", icon: ListChecks },
};

/**
 * The "recent activity" feed is the newest rows actually created in SPY (leads, finance entries,
 * tasks...) — real records with real timestamps, not a simulated event stream.
 */
export function RecentActivityPanel({ state }: { state: DataState<SpyKpiSnapshot> }) {
  const rows = state.data?.recent.slice(0, 4) ?? [];

  return (
    <GlassPanel title="Últimos registros no SPY" action={<DataStateBadge status={state.status} lastUpdated={state.lastUpdated} />}>
      {!state.data ? (
        <NotConnectedPanel reason={state.error ?? "SPY não conectado"} />
      ) : rows.length === 0 ? (
        <p className="py-2 text-xs text-white/40">Nenhum registro recente.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => {
            const meta = TABLE_META[row.table] ?? { label: row.table, icon: FileText };
            return (
              <li key={`${row.table}-${row.id}`} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30 text-white/50">
                  <meta.icon size={12} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-white/80">{row.label}</span>
                  <span className="block text-[10px] text-white/35">{meta.label}</span>
                </span>
                <span className="shrink-0 text-[10px] text-white/35">{timeAgo(row.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </GlassPanel>
  );
}
