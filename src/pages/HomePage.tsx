import { useState } from "react";
import { Workflow, Users, Wallet, ListChecks, MessageCircle, Sparkles, Send, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { EnergySphere } from "../components/sphere/EnergySphere";
import { TranscriptOverlay } from "../components/voice/TranscriptOverlay";
import { StatTile } from "../components/dashboard/StatTile";
import { AgentRosterPanel } from "../components/dashboard/AgentRosterPanel";
import { SystemStatusPanel } from "../components/dashboard/SystemStatusPanel";
import { QuickAccessGrid } from "../components/dashboard/QuickAccessGrid";
import { LoadingPulse } from "../components/common/LoadingPulse";
import { useDashboardData } from "../hooks/useDashboardData";
import { useJarvisChat } from "../hooks/useJarvisChat";
import { useJarvisStore } from "../state/store";

function spyCount(counts: { table: string; count: number }[] | undefined, table: string) {
  return counts?.find((c) => c.table === table)?.count ?? null;
}

export function HomePage() {
  const { snapshot, socketConnected } = useDashboardData();
  const { sendMessage } = useJarvisChat();
  const setCommsDockOpen = useJarvisStore((s) => s.setCommsDockOpen);
  const [prompt, setPrompt] = useState("");

  const handleQuickAsk = (textToSend?: string) => {
    const query = (textToSend || prompt).trim();
    if (!query) return;
    setCommsDockOpen(true);
    sendMessage(query);
    setPrompt("");
  };

  if (!socketConnected || !snapshot) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingPulse label="Sincronizando Central de Comando..." />
      </div>
    );
  }

  const spy = snapshot.spy;
  const n8n = snapshot.n8n;

  const suggestions = [
    "Qual o status do funil de vendas?",
    "Resumo dos lançamentos financeiros",
    "Listar automações ativas no n8n",
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:p-5 font-sans">
      {/* 1. Top Section Header: Situational Context */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold tracking-wide text-white">Central de Comando</h1>
          <p className="font-mono text-xs text-white/40">Visão Geral dos Principais Indicadores e Inteligência</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/aurora"
            className="flex items-center gap-1.5 rounded-full border border-jarvis-cyan/40 bg-jarvis-cyan/15 px-3.5 py-1.5 font-mono text-xs font-semibold text-jarvis-cyanBright hover:bg-jarvis-cyan/25 transition-all shadow-[0_0_15px_rgba(79,215,255,0.15)]"
          >
            <Sparkles size={13} /> Modo Imersivo Aurora
          </Link>
        </div>
      </div>

      {/* 2. Top Metrics Grid: Equal Height & Aligned Baselines */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Workflows Ativos"
          icon={Workflow}
          value={n8n.data ? n8n.data.activeCount : null}
          status={n8n.status}
          hint={n8n.data ? `${n8n.data.inactiveCount} inativos` : undefined}
          href="/automacoes"
        />
        <StatTile
          label="Leads (SPY)"
          icon={Users}
          value={spyCount(spy.data?.counts, "leads")}
          status={spy.status}
          href="/crm"
        />
        <StatTile
          label="Clientes (SPY)"
          icon={Users}
          value={spyCount(spy.data?.counts, "clientes")}
          status={spy.status}
          href="/crm"
        />
        <StatTile
          label="Lançamentos Financeiros"
          icon={Wallet}
          value={spyCount(spy.data?.counts, "finance_entries")}
          status={spy.status}
          href="/directors/cfo"
        />
        <StatTile
          label="Tarefas de Sprint"
          icon={ListChecks}
          value={spyCount(spy.data?.counts, "dev_sprint_tasks")}
          status={spy.status}
          href="/directors/coo"
        />
        <StatTile
          label="WhatsApp (WAHA)"
          icon={MessageCircle}
          value={snapshot.waha.data?.status === "WORKING" ? "Conectado" : snapshot.waha.data?.status ?? null}
          status={snapshot.waha.status}
        />
      </div>

      {/* 3. Center 3D Stage & Right Status Panels */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        {/* 3D Orb Stage with Integrated Command Bar */}
        <div className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-2xl border border-jarvis-cyan/20 bg-[#060a16]/75 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          {/* Header pill */}
          <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 font-mono text-[11px] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-jarvis-cyanBright animate-pulse" />
            <span className="font-bold text-white">NÚCLEO 3D DA AURORA</span>
          </div>

          {/* 3D Canvas */}
          <div className="absolute inset-0">
            <EnergySphere />
            <TranscriptOverlay />
          </div>

          {/* Bottom Quick Command Bar */}
          <div className="relative z-20 mt-auto p-4">
            <div className="rounded-2xl border border-jarvis-cyan/30 bg-black/75 p-2 backdrop-blur-2xl shadow-2xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickAsk();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Perguntar ou solicitar uma ação à Aurora..."
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-jarvis-cyan text-black transition-all hover:bg-jarvis-cyanBright disabled:opacity-30"
                  title="Enviar comando"
                >
                  <Send size={13} />
                </button>
              </form>

              {/* Suggestions */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
                <span className="font-mono text-[10px] uppercase text-white/30">Sugestões:</span>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickAsk(s)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60 hover:border-jarvis-cyan/40 hover:text-white transition-colors"
                  >
                    <span>{s}</span>
                    <ArrowRight size={10} className="text-jarvis-cyan" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sci-Fi Corner Brackets */}
          <div className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-t-2 border-l-2 border-jarvis-cyan/40" />
          <div className="pointer-events-none absolute top-2 right-2 h-3 w-3 border-t-2 border-r-2 border-jarvis-cyan/40" />
          <div className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-jarvis-cyan/40" />
          <div className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-jarvis-cyan/40" />
        </div>

        {/* Right Status & Roster Panels */}
        <div className="flex flex-col gap-4">
          <AgentRosterPanel state={n8n} compact />
          <SystemStatusPanel snapshot={snapshot} />
        </div>
      </div>

      {/* 4. Bottom Quick Access Launcher */}
      <QuickAccessGrid snapshot={snapshot} />
    </div>
  );
}
