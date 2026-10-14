import { useDashboardData } from "../hooks/useDashboardData";
import { N8nWorkflowsPanel } from "../components/dashboard/panels/N8nWorkflowsPanel";
import { SpyKpiPanel } from "../components/dashboard/panels/SpyKpiPanel";
import { WahaStatusPanel } from "../components/dashboard/panels/WahaStatusPanel";
import { LoadingPulse } from "../components/common/LoadingPulse";
import { BarChart3, Activity } from "lucide-react";

export function AnalyticsPage() {
  const { snapshot, apiConnected } = useDashboardData();

  if (!apiConnected || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingPulse label="Sincronizando Métricas em Tempo Real..." />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-jarvis-accent/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-wide text-white">Analytics &amp; Telemetria</h1>
            <span className="rounded-full bg-jarvis-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-jarvis-accentBright">
              Live Feeds
            </span>
          </div>
          <p className="font-mono text-xs text-white/40">
            Painéis de Desempenho e Estado em Tempo Real das Integrações
          </p>
        </div>
      </div>

      {/* Grid of live panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <N8nWorkflowsPanel state={snapshot.n8n} />
        <SpyKpiPanel state={snapshot.spy} />
        <WahaStatusPanel state={snapshot.waha} />
      </div>
    </div>
  );
}
