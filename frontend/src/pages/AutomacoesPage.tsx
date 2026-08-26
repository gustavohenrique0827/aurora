import { Link } from "react-router-dom";
import { DIRECTORS } from "@jarvis/shared";
import type { N8nWorkflowSummary } from "@jarvis/shared";
import { Workflow, Cpu, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { GlassPanel } from "../components/common/GlassPanel";
import { DataStateBadge } from "../components/dashboard/DataStateBadge";
import { NotConnectedPanel } from "../components/dashboard/panels/NotConnectedPanel";
import { LoadingPulse } from "../components/common/LoadingPulse";
import { useDashboardData } from "../hooks/useDashboardData";

function classify(w: N8nWorkflowSummary): "Diretoria Executiva" | "Gerências" | "Robôs de Pesquisa" | "Outros" {
  const name = w.name.replace("[G-TECH AI OS] ", "");
  if (DIRECTORS.some((d) => d.name === name)) return "Diretoria Executiva";
  if (/ger[eê]ncia/i.test(name)) return "Gerências";
  if (/rob[oô] pesquisa/i.test(name)) return "Robôs de Pesquisa";
  return "Outros";
}

const GROUP_ORDER = ["Diretoria Executiva", "Gerências", "Robôs de Pesquisa", "Outros"] as const;

export function AutomacoesPage() {
  const { snapshot, socketConnected } = useDashboardData();

  if (!socketConnected || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingPulse label="Sincronizando Workflows do n8n..." />
      </div>
    );
  }

  const { n8n } = snapshot;

  if (!n8n.data) {
    return (
      <div className="p-5">
        <GlassPanel title="Automações (n8n)" action={<DataStateBadge status={n8n.status} lastUpdated={n8n.lastUpdated} />}>
          <NotConnectedPanel reason={n8n.error ?? "Sem credencial de API do n8n configurada"} />
        </GlassPanel>
      </div>
    );
  }

  const groups = GROUP_ORDER.map((label) => ({
    label,
    workflows: n8n.data!.workflows.filter((w) => classify(w) === label),
  })).filter((g) => g.workflows.length > 0);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 font-sans">
      {/* 1. Top Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jarvis-cyan/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-wide text-white">Automações &amp; Workflows</h1>
            <DataStateBadge status={n8n.status} lastUpdated={n8n.lastUpdated} />
          </div>
          <p className="font-mono text-xs text-white/40">
            Monitoramento de Fluxos n8n da Diretoria Executiva, Gerências e Robôs Autônomos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-jarvis-green shadow-[0_0_6px_#5cffb0]" />
            <span className="font-bold text-jarvis-green">{n8n.data.activeCount} ativos</span>
            <span className="text-white/30">•</span>
            <span className="text-white/40">{n8n.data.inactiveCount} inativos</span>
          </div>

          <Link
            to="/directors/cto"
            className="flex items-center gap-1.5 rounded-full border border-jarvis-cyan/40 bg-jarvis-cyan/15 px-3.5 py-1 font-mono text-xs font-semibold text-jarvis-cyanBright hover:bg-jarvis-cyan/25 transition-all shadow-[0_0_15px_rgba(79,215,255,0.15)]"
          >
            <Cpu size={13} />
            <span>Falar com CTO AI</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* 2. Categorized Groups */}
      {groups.map((group) => (
        <GlassPanel key={group.label} title={group.label}>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.workflows.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 p-2.5 transition-all hover:border-jarvis-cyan/40 hover:bg-black/50"
              >
                <div className="flex items-center gap-2 truncate">
                  <Workflow size={13} className={w.active ? "text-jarvis-cyanBright" : "text-white/30"} />
                  <span className="font-mono text-xs truncate text-white/85">
                    {w.name.replace("[G-TECH AI OS] ", "")}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[9px] font-bold ${
                    w.active
                      ? "bg-jarvis-green/20 text-jarvis-green border border-jarvis-green/30"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  {w.active ? "ATIVO" : "INATIVO"}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      ))}
    </div>
  );
}
