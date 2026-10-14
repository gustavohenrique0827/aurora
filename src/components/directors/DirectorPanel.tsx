import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DIRECTORS } from "@jarvis/shared";
import { ArrowLeft, MessageSquare, Send, Zap, Bot, ShieldCheck } from "lucide-react";
import { useJarvisStore } from "../../state/store";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useJarvisChat } from "../../hooks/useJarvisChat";
import { GlassPanel } from "../common/GlassPanel";
import { DataStateBadge } from "../dashboard/DataStateBadge";
import { NotConnectedPanel } from "../dashboard/panels/NotConnectedPanel";

export function DirectorPanel() {
  const { id } = useParams<{ id: string }>();
  const director = DIRECTORS.find((d) => d.id === id);
  const setActiveDirectorId = useJarvisStore((s) => s.setActiveDirectorId);
  const setCommsDockOpen = useJarvisStore((s) => s.setCommsDockOpen);
  const { snapshot } = useDashboardData();
  const { sendMessage } = useJarvisChat();
  const [directPrompt, setDirectPrompt] = useState("");

  useEffect(() => {
    if (!director) return;
    setActiveDirectorId(director.id);
    setCommsDockOpen(true);
    return () => setActiveDirectorId(null);
  }, [director, setActiveDirectorId, setCommsDockOpen]);

  if (!director) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-white/50">
        <Bot size={36} className="text-white/20" />
        <span className="font-medium text-sm text-white/70">Diretor não encontrado na estrutura executiva.</span>
        <Link to="/agentes" className="btn-secondary text-xs">
          ← Voltar aos Agentes
        </Link>
      </div>
    );
  }

  const relatedWorkflows =
    snapshot?.n8n.data?.workflows.filter((w) =>
      w.name.toLowerCase().includes(director.name.split(" ")[0].toLowerCase())
    ) ?? [];

  const handleSendToDirector = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = directPrompt.trim();
    if (!query) return;
    sendMessage(query, director.id);
    setDirectPrompt("");
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto font-sans">
      {/* Header with Back Navigation & Director Profile */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jarvis-accent/15 bg-[#0a0b0d]/60 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <Link
            to="/agentes"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white/50 transition-colors hover:border-jarvis-accent/40 hover:text-white"
            title="Voltar para a Diretoria"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-jarvis-accent/40 bg-jarvis-accent/10 text-sm font-bold text-jarvis-accentBright shadow-[0_0_15px_rgba(255,122,26,0.1)]">
            {director.name.slice(0, 2)}
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-black bg-jarvis-green shadow-[0_0_6px_#5cffb0]" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-white">{director.name}</div>
            <div className="font-mono text-xs text-white/40">{director.title}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-jarvis-accent/30 bg-jarvis-accent/10 px-3 py-1 font-mono text-[11px] font-semibold text-jarvis-accentBright">
            <MessageSquare size={12} /> CONVERSA ATIVA
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 p-5">
        {/* Direct In-page Quick Prompt */}
        <div className="rounded-2xl border border-jarvis-accent/25 bg-[#101114]/80 p-3.5 backdrop-blur-xl shadow-xl">
          <div className="mb-2 flex items-center justify-between text-xs text-white/60">
            <span className="font-medium">Mensagem direta para {director.name}</span>
            <span className="font-mono text-[10px] text-white/30">IA Especializada</span>
          </div>
          <form onSubmit={handleSendToDirector} className="flex items-center gap-2">
            <input
              type="text"
              value={directPrompt}
              onChange={(e) => setDirectPrompt(e.target.value)}
              placeholder={`Pergunte algo sobre ${director.title.toLowerCase()}...`}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-jarvis-accent/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!directPrompt.trim()}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-jarvis-accent px-3.5 text-xs font-bold text-black transition-all hover:bg-jarvis-accentBright disabled:opacity-30"
            >
              <Send size={13} /> Enviar
            </button>
          </form>
        </div>

        {/* Info & Workflows Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <GlassPanel
            title="Workflows Conectados (n8n)"
            action={<DataStateBadge status={snapshot?.n8n.status ?? "unavailable"} lastUpdated={snapshot?.n8n.lastUpdated ?? null} />}
          >
            {relatedWorkflows.length === 0 ? (
              <NotConnectedPanel reason="Nenhum workflow correspondente encontrado no snapshot atual do n8n" />
            ) : (
              <ul className="space-y-2 text-xs">
                {relatedWorkflows.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 p-2.5">
                    <span className="font-mono truncate text-white/80">{w.name.replace("[G-TECH AI OS] ", "")}</span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 font-mono text-[9px] font-bold ${
                        w.active ? "bg-jarvis-green/20 text-jarvis-green border border-jarvis-green/40" : "bg-white/5 text-white/30"
                      }`}
                    >
                      {w.active ? "ATIVO" : "INATIVO"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>

          <GlassPanel title="Responsabilidades & Escopo">
            <div className="space-y-2 text-xs leading-relaxed text-white/70">
              <p>
                Especialista de IA executiva do <strong>G-TECH AI OS</strong>. Perguntas enviadas no dock ou neste painel chegam com contexto exclusivo do cargo e das automações integradas.
              </p>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-white/50">
                • Status: Pronto para atendimento<br />
                • Integração: n8n Webhook / REST<br />
                • Escopo: Diretoria Executiva
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
