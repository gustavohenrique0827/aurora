import { Link } from "react-router-dom";
import { Users, Handshake, ArrowRight, UserCheck, PhoneCall, TrendingUp } from "lucide-react";
import { GlassPanel } from "../components/common/GlassPanel";
import { DataStateBadge } from "../components/dashboard/DataStateBadge";
import { NotConnectedPanel } from "../components/dashboard/panels/NotConnectedPanel";
import { LoadingPulse } from "../components/common/LoadingPulse";
import { useDashboardData } from "../hooks/useDashboardData";

const CRM_TABLES = ["leads", "clientes", "contracts", "proposals"];
const TABLE_LABEL: Record<string, string> = {
  leads: "Leads Cadastrados",
  clientes: "Clientes Ativos",
  contracts: "Contratos",
  proposals: "Propostas Enviadas",
};

export function CrmPage() {
  const { snapshot, apiConnected } = useDashboardData();

  if (!apiConnected || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingPulse label="Sincronizando CRM SPY..." />
      </div>
    );
  }

  const { spy } = snapshot;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 font-sans">
      {/* 1. Header with Breadcrumb & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jarvis-accent/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-wide text-white">CRM &amp; Clientes</h1>
            <DataStateBadge status={spy.status} lastUpdated={spy.lastUpdated} />
          </div>
          <p className="font-mono text-xs text-white/40">
            Acompanhamento de Oportunidades, Leads e Contratos (Base Supabase SPY)
          </p>
        </div>

        <Link
          to="/directors/cco"
          className="flex items-center gap-1.5 rounded-full border border-jarvis-accent/40 bg-jarvis-accent/15 px-4 py-1.5 font-mono text-xs font-semibold text-jarvis-accentBright hover:bg-jarvis-accent/25 transition-all shadow-[0_0_15px_rgba(255,122,26,0.15)]"
        >
          <Handshake size={13} />
          <span>Falar com o CCO AI</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {!spy.data ? (
        <GlassPanel title="SPY (CRM/ERP G-TECH)">
          <NotConnectedPanel reason={spy.error ?? "Credencial do SPY não configurada"} />
        </GlassPanel>
      ) : (
        <>
          {/* 2. Top Metrics Grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {spy.data.counts
              .filter((c) => CRM_TABLES.includes(c.table))
              .map((c) => (
                <div
                  key={c.table}
                  className="rounded-2xl border border-jarvis-accent/20 bg-[#101114]/75 p-4 backdrop-blur-xl transition-all hover:border-jarvis-accent/50 hover:shadow-[0_0_20px_rgba(255,122,26,0.15)]"
                >
                  <div className="font-display text-2xl font-bold text-white group-hover:text-jarvis-accentBright">
                    {c.count}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
                    {TABLE_LABEL[c.table] ?? c.table}
                  </div>
                </div>
              ))}
          </div>

          {/* 3. Recent Records List */}
          <GlassPanel title="Cadastros e Negociações Recentes">
            {spy.data.recent.filter((r) => CRM_TABLES.includes(r.table)).length === 0 ? (
              <NotConnectedPanel reason="Nenhum lead/cliente cadastrado ainda no SPY" />
            ) : (
              <ul className="space-y-2 text-xs">
                {spy.data.recent
                  .filter((r) => CRM_TABLES.includes(r.table))
                  .map((row) => (
                    <li
                      key={`${row.table}-${row.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 p-2.5 transition-colors hover:bg-black/50"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-jarvis-accent" />
                        <span className="truncate font-medium text-white/85">{row.label}</span>
                      </div>
                      <span className="shrink-0 rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/40">
                        {TABLE_LABEL[row.table] ?? row.table}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </GlassPanel>

          {/* 4. Sub-Status Info Note */}
          <div className="rounded-2xl border border-white/10 bg-[#101114]/50 px-4 py-3 font-mono text-xs text-white/40">
            💡 <strong>Integração Ativa</strong>: Os dados acima refletem as contagens ao vivo do banco de dados SPY da G-TECH.
          </div>
        </>
      )}
    </div>
  );
}
