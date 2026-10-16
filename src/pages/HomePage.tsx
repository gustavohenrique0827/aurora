import { useState } from "react";
import { Workflow, Users, Wallet, ListChecks, MessageCircle, Sparkles, Send, ArrowRight, Activity, Target, Zap, MessagesSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { EnergySphere } from "../components/sphere/EnergySphere";
import { TranscriptOverlay } from "../components/voice/TranscriptOverlay";
import { StatTile } from "../components/dashboard/StatTile";
import { AgentRosterPanel } from "../components/dashboard/AgentRosterPanel";
import { SystemStatusPanel } from "../components/dashboard/SystemStatusPanel";
import { QuickAccessGrid } from "../components/dashboard/QuickAccessGrid";
import { RecentActivityPanel } from "../components/dashboard/RecentActivityPanel";
import { LoadingPulse } from "../components/common/LoadingPulse";
import { useDashboardData } from "../hooks/useDashboardData";
import { useJarvisChat } from "../hooks/useJarvisChat";
import { useJarvisStore } from "../state/store";

function spyCount(counts: { table: string; count: number }[] | undefined, table: string) {
  return counts?.find((c) => c.table === table)?.count ?? null;
}

export function HomePage() {
  const { snapshot, apiConnected } = useDashboardData();
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

  if (!apiConnected || !snapshot) {
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
          <h1 className="font-display text-xl font-semibold tracking-tight text-white">Central de Comando</h1>
          <p className="text-xs text-white/50">Indicadores e inteligência em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/aurora"
            className="flex items-center gap-1.5 rounded-full border border-jarvis-accent/40 bg-jarvis-accent/15 px-3.5 py-1.5 font-mono text-xs font-semibold text-jarvis-accentBright hover:bg-jarvis-accent/25 transition-all "
          >
            <Sparkles size={13} /> Modo imersivo
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

      {/* 3. Hero (Aurora + command bar) with the live side panels */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <section className="relative flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-jarvis-border bg-[#0c0d10]/90 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Aurora 3D — offset to the right on wide screens so the copy has room on the left */}
          <div className="absolute inset-0 lg:left-[36%]">
            <EnergySphere />
            <TranscriptOverlay />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0c0d10] via-[#0c0d10]/60 to-transparent lg:via-[#0c0d10]/30" />

          <div className="pointer-events-none relative z-10 max-w-[22rem] p-5 md:p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-jarvis-accent" />
              Aurora
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
              Sua inteligência <span className="text-jarvis-accent">operacional</span> em tempo real
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-white/55">
              Conectada aos seus módulos: analisa dados, sugere ações e executa automações por comandos em linguagem natural.
            </p>
            <ul className="mt-4 hidden space-y-1.5 text-[13px] text-white/65 md:block">
              {[
                [Activity, "Analisa dados em tempo real"],
                [Target, "Identifica oportunidades"],
                [Zap, "Executa automações"],
                [MessagesSquare, "Responde em linguagem natural"],
              ].map(([Icon, text]) => {
                const I = Icon as typeof Activity;
                return (
                  <li key={text as string} className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border border-jarvis-accent/30 bg-jarvis-accent/10 text-jarvis-accentBright">
                      <I size={13} />
                    </span>
                    {text as string}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Bottom quick command bar */}
          <div className="relative z-20 mt-auto p-4">
            <div className="rounded-2xl border border-white/10 bg-black/70 p-2 backdrop-blur-2xl">
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
                  className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-jarvis-accent text-black transition-colors hover:bg-jarvis-accentBright disabled:opacity-30"
                  title="Enviar comando"
                >
                  <Send size={14} />
                </button>
              </form>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
                <span className="text-[10px] uppercase tracking-wider text-white/30">Sugestões</span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleQuickAsk(s)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition-colors hover:border-jarvis-accent/40 hover:text-white"
                  >
                    {s}
                    <ArrowRight size={10} className="text-jarvis-accent" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right: roster, integrations, latest SPY records */}
        <div className="flex flex-col gap-4">
          <AgentRosterPanel state={n8n} compact />
          <SystemStatusPanel snapshot={snapshot} />
          <RecentActivityPanel state={spy} />
        </div>
      </div>

      {/* 4. Bottom Quick Access Launcher */}
      <QuickAccessGrid snapshot={snapshot} />
    </div>
  );
}
