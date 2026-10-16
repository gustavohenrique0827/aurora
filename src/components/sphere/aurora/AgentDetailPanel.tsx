import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3, Briefcase, Brain, Calculator, Cpu, Database, FileText, Gavel, Handshake, HeartHandshake,
  Layers, LineChart, Map as MapIcon, Megaphone, MessageCircle, MessageSquare, Radar, Rocket, Scale, Search,
  Server, ShieldCheck, Sparkles, Target, TrendingUp, Users, Wallet, Workflow, X, type LucideIcon,
  BrainCircuit,
} from "lucide-react";
import { useJarvisStore } from "../../../state/store";
import { timeAgo } from "../../../lib/timeAgo";
import { AGENT_ROSTER, resolveAgentLive, type AgentLiveStatus } from "./agentRoster";

const STATUS_LABEL: Record<AgentLiveStatus, string> = {
  active: "Ativo no n8n",
  inactive: "Inativo no n8n",
  unknown: "Status indisponível",
};

const STATUS_DOT: Record<AgentLiveStatus, string> = {
  active: "bg-jarvis-green shadow-[0_0_8px_#5cffb0]",
  inactive: "bg-white/25",
  unknown: "bg-jarvis-amber/70",
};

const EXEC_LABEL: Record<string, string> = {
  success: "última execução ok",
  error: "última execução com erro",
  running: "executando agora",
  unknown: "execução desconhecida",
};

const AGENT_ICONS: Record<string, LucideIcon[]> = {
  ceo: [Target, TrendingUp, Rocket],
  cto: [Cpu, Server, ShieldCheck],
  cfo: [Wallet, BarChart3, Calculator],
  cco: [Handshake, Users, LineChart],
  coo: [Workflow, Layers, Briefcase],
  cmo: [Megaphone, Target, LineChart],
  cpo: [Rocket, MapIcon, Layers],
  cio: [Database, Brain, ShieldCheck],
  chro: [Users, HeartHandshake, Briefcase],
  general_counsel: [Scale, Gavel, FileText],
  radar: [Radar, Search, MapIcon],
  closer: [Handshake, Target, Wallet],
  sdr: [MessageCircle, Users, Target],
};

interface AgentDetailPanelProps {
  /** Prefills the Aurora input — never sends on its own. */
  onAsk: (text: string) => void;
}

/** Agent legend (left) + detail card for the neuron opened inside Aurora's head. */
export function AgentDetailPanel({ onAsk }: AgentDetailPanelProps) {
  const openedKey = useJarvisStore((s) => s.openedAgentKey);
  const setOpenedAgentKey = useJarvisStore((s) => s.setOpenedAgentKey);
  const activeDirectorId = useJarvisStore((s) => s.activeDirectorId);
  const setActiveDirectorId = useJarvisStore((s) => s.setActiveDirectorId);
  const workflows = useJarvisStore((s) => s.dashboardSnapshot?.n8n.data?.workflows);
  const brainOpen = useJarvisStore((s) => s.brainOpen);
  const setBrainOpen = useJarvisStore((s) => s.setBrainOpen);

  const agent = AGENT_ROSTER.find((a) => a.key === openedKey) ?? null;
  const live = useMemo(() => (agent ? resolveAgentLive(agent, workflows) : null), [agent, workflows]);
  const statuses = useMemo(() => AGENT_ROSTER.map((a) => resolveAgentLive(a, workflows).status), [workflows]);

  // Esc closes the agent card first, then the open brain.
  useEffect(() => {
    if (!openedKey && !brainOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openedKey) setOpenedAgentKey(null);
      else setBrainOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openedKey, brainOpen, setOpenedAgentKey, setBrainOpen]);

  const isScoped = agent?.directorId != null && agent.directorId === activeDirectorId;
  const lastRun = live ? timeAgo(live.lastExecutionAt) : null;

  return (
    <>
      <nav
        aria-label="Agentes da Aurora"
        className="pointer-events-auto absolute bottom-3 left-1/2 z-30 hidden max-w-[92%] -translate-x-1/2 flex-row flex-wrap items-center justify-center gap-1 md:flex"
      >
        <button
          type="button"
          aria-pressed={brainOpen}
          onClick={() => setBrainOpen(!brainOpen)}
          className={`mr-2 flex items-center gap-2 rounded-full border px-2.5 py-1.5 font-mono text-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-jarvis-accentBright ${
            brainOpen ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-black/40 text-white/70 hover:border-white/25 hover:text-white"
          }`}
        >
          <BrainCircuit size={13} />
          {brainOpen ? "Fechar cérebro" : "Abrir cérebro"}
        </button>
        {AGENT_ROSTER.map((a, i) => {
          const selected = a.key === openedKey;
          return (
            <button
              key={a.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setOpenedAgentKey(selected ? null : a.key)}
              className={`group flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-jarvis-accentBright ${
                selected
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/5 bg-black/40 text-white/55 hover:border-white/20 hover:text-white"
              } ${i === 10 ? "mt-2" : ""}`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: a.color,
                  boxShadow: `0 0 8px ${a.color}`,
                  opacity: statuses[i] === "inactive" ? 0.4 : 1,
                }}
              />
              <span>{a.short}</span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
        {agent && live && (
          <motion.aside
            key={agent.key}
            role="dialog"
            aria-label={`Agente ${agent.name}`}
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="pointer-events-auto absolute right-4 top-24 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-2 border-dashed bg-[#101114]/90 backdrop-blur-2xl"
            style={{ borderColor: `${agent.color}80`, boxShadow: `0 0 40px ${agent.color}26` }}
          >
            <div className="p-4">
              <header className="flex items-start gap-3">
                <span
                  className="mt-1 h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: agent.color, boxShadow: `0 0 14px ${agent.color}` }}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-bold leading-tight text-white text-balance">{agent.name}</h2>
                  <p className="text-xs text-white/60">{agent.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedAgentKey(null)}
                  aria-label="Fechar"
                  className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-jarvis-accentBright"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="mt-3 flex items-center gap-2.5" aria-hidden="true">
                {(AGENT_ICONS[agent.key] ?? []).map((Icon, i) => (
                  <span
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${agent.color}1f`, color: agent.color, boxShadow: `inset 0 0 0 1px ${agent.color}40` }}
                  >
                    <Icon size={18} />
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] text-white/70">
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[live.status]}`} />
                  {STATUS_LABEL[live.status]}
                </span>
                {live.lastExecutionStatus && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                    {EXEC_LABEL[live.lastExecutionStatus] ?? live.lastExecutionStatus}
                    {lastRun ? ` · ${lastRun}` : ""}
                  </span>
                )}
                {isScoped && (
                  <span className="rounded-full px-2 py-0.5 text-black" style={{ backgroundColor: agent.color }}>
                    Conversa direcionada
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-white/80">{agent.description}</p>

              {live.subordinates.length > 0 && (
                <section className="mt-4">
                  <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">Coordena</h3>
                  <ul className="flex flex-col gap-1">
                    {live.subordinates.map((s) => (
                      <li key={s.label} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/75">
                        <span>{s.label}</span>
                        <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/45">
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
                          {s.status === "active" ? "ativa" : s.status === "inactive" ? "inativa" : "sem dado"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {agent.directorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDirectorId(isScoped ? null : agent.directorId);
                      setOpenedAgentKey(null);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-black transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    <MessageSquare size={15} />
                    {isScoped ? "Voltar a falar com a Aurora" : `Falar direto com o ${agent.short}`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onAsk(`Aurora, consulte o ${agent.name} e me diga `);
                    setOpenedAgentKey(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-jarvis-accentBright"
                >
                  <Sparkles size={15} />
                  Pedir para a Aurora consultar
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
