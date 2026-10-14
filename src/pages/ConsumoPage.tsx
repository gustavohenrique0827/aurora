import { useEffect, useState } from "react";
import type { TokenUsageSnapshot } from "@jarvis/shared";
import { Coins, Zap, Hash } from "lucide-react";
import { GlassPanel } from "../components/common/GlassPanel";
import { CollapsibleGroup } from "../components/common/CollapsibleGroup";
import { LoadingPulse } from "../components/common/LoadingPulse";
import { StatTile } from "../components/dashboard/StatTile";
import { api } from "../lib/api";
import { AGENT_GROUP_ORDER, GROUP_ICON } from "../lib/agentGroups";
import { timeAgo } from "../lib/timeAgo";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 });
const NUMBER_FORMAT = new Intl.NumberFormat("pt-BR");

export function ConsumoPage() {
  const [snapshot, setSnapshot] = useState<TokenUsageSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: prev[key] === false ? true : false }));

  useEffect(() => {
    let cancelled = false;
    api
      .tokenUsageSummary()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="p-5">
        <GlassPanel title="Consumo de Tokens">
          <p className="font-mono text-xs text-jarvis-red">Não foi possível carregar o consumo: {error}</p>
        </GlassPanel>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingPulse label="Somando uso de tokens..." />
      </div>
    );
  }

  const groups = AGENT_GROUP_ORDER.map((label) => ({
    label,
    agents: snapshot.byAgent.filter((a) => a.agentGroup === label),
  })).filter((g) => g.agents.length > 0);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 font-sans">
      <div className="border-b border-jarvis-cyan/15 pb-4">
        <h1 className="font-display text-lg font-bold tracking-wide text-white">Consumo de Tokens</h1>
        <p className="font-mono text-xs text-white/40">
          {snapshot.byAgent.length} agentes com uso registrado · custo estimado a partir do preço público do Gemini
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Custo total estimado"
          icon={Coins}
          value={USD_FORMAT.format(snapshot.totalCostUsd)}
          status="live"
        />
        <StatTile
          label="Tokens totais"
          icon={Hash}
          value={NUMBER_FORMAT.format(snapshot.totalTokens)}
          status="live"
        />
        <StatTile label="Agentes com uso" icon={Zap} value={snapshot.byAgent.length} status="live" />
      </div>

      {groups.length === 0 && (
        <GlassPanel title="Sem dados ainda">
          <p className="font-mono text-xs text-white/40">
            Nenhum agente registrou uso de tokens ainda. Assim que Aurora ou qualquer outro agente responder, o
            consumo aparece aqui.
          </p>
        </GlassPanel>
      )}

      {groups.map((group) => (
        <CollapsibleGroup
          key={group.label}
          title={group.label}
          count={group.agents.length}
          icon={GROUP_ICON[group.label]}
          open={openGroups[group.label] ?? true}
          onToggle={() => toggleGroup(group.label)}
        >
          <ul className="flex flex-col gap-2">
            {group.agents.map((agent) => {
              const lastUsed = timeAgo(agent.lastUsedAt);
              return (
                <li
                  key={`${agent.workflowName}-${agent.model}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3 transition-all hover:border-jarvis-cyan/40 hover:bg-black/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-white/85">{agent.workflowName}</p>
                    <p className="font-mono text-[10px] text-white/35">
                      {agent.model} · {agent.calls} chamada{agent.calls === 1 ? "" : "s"}
                      {lastUsed ? ` · última ${lastUsed}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="font-mono text-sm font-bold text-jarvis-cyanBright">
                      {USD_FORMAT.format(agent.costUsd)}
                    </span>
                    <span className="font-mono text-[10px] text-white/35">{NUMBER_FORMAT.format(agent.totalTokens)} tokens</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </CollapsibleGroup>
      ))}
    </div>
  );
}
