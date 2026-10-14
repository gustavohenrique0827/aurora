import { Link } from "react-router-dom";
import { DIRECTORS } from "@jarvis/shared";
import type { DataState, N8nSnapshot } from "@jarvis/shared";
import { GlassPanel } from "../common/GlassPanel";
import { DataStateBadge } from "./DataStateBadge";
import { NotConnectedPanel } from "./panels/NotConnectedPanel";

/**
 * "ativo/inativo" here means the n8n workflow's activation flag (real, from the n8n API) —
 * deliberately NOT an "online/offline" process indicator, since these are on-demand
 * sub-workflow agents invoked by AURORA CORE, not always-running daemons. See
 * [[gtech-jarvis-architecture]]: every G-TECH AI OS workflow is inactive until Gustavo
 * decides to activate it, so an honest roster today mostly reads "inativo" — that's correct,
 * not a bug.
 */
export function AgentRosterPanel({ state, compact = false }: { state: DataState<N8nSnapshot>; compact?: boolean }) {
  const matchWorkflow = (directorName: string) =>
    state.data?.workflows.find((w) => w.name.toLowerCase().includes(directorName.split(" ")[0].toLowerCase()));

  const directors = compact ? DIRECTORS.slice(0, 6) : DIRECTORS;

  return (
    <GlassPanel title="Diretoria Executiva" action={<DataStateBadge status={state.status} lastUpdated={state.lastUpdated} />}>
      {!state.data ? (
        <NotConnectedPanel reason={state.error ?? "Sem credencial de API do n8n configurada"} />
      ) : (
        <ul className="space-y-1">
          {directors.map((d) => {
            const wf = matchWorkflow(d.name);
            const active = wf?.active ?? false;
            return (
              <li key={d.id}>
                <Link
                  to={`/directors/${d.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-jarvis-green animate-pulseGlow" : "bg-white/20"}`} />
                  <span className="flex-1 truncate text-white/75">{d.name}</span>
                  <span className={`shrink-0 text-[9px] uppercase tracking-wider ${active ? "text-jarvis-green" : "text-white/25"}`}>
                    {active ? "ativo" : "inativo"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </GlassPanel>
  );
}
