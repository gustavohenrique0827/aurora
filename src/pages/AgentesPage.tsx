import { Link } from "react-router-dom";
import { Users, Bot, ArrowRight } from "lucide-react";
import { DirectorGrid } from "../components/directors/DirectorGrid";
import { useDashboardData } from "../hooks/useDashboardData";

export function AgentesPage() {
  const { snapshot } = useDashboardData();
  const workflows = snapshot?.n8n.data?.workflows ?? [];
  const gerenciasCount = workflows.filter((w) => /ger[eê]ncia/i.test(w.name)).length;
  const researchCount = workflows.filter((w) => /rob[oô] pesquisa/i.test(w.name)).length;
  const activeCount = workflows.filter((w) => w.active).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 font-sans">
      {/* Header with Situational Hierarchy */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-jarvis-cyan/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-wide text-white">Diretoria Executiva</h1>
            <span className="rounded-full bg-jarvis-cyan/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-jarvis-cyanBright">
              10 Diretores AI
            </span>
          </div>
          <p className="font-mono text-xs text-white/40">
            Selecione um diretor para abrir seu painel dedicado ou interagir diretamente por voz/texto
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1 font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-jarvis-green shadow-[0_0_8px_#5cffb0]" />
            <span className="text-white/40">Ativos no n8n:</span>
            <span className="font-semibold text-white">{activeCount} / {workflows.length || 10}</span>
          </div>
        </div>
      </div>

      {/* Directors Grid */}
      <div className="flex-1">
        <DirectorGrid />
      </div>

      {/* Tactical Sub-layer Footer Card */}
      {(gerenciasCount > 0 || researchCount > 0) && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-jarvis-cyan/15 bg-[#0a0f1d]/60 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-jarvis-cyanBright">
              <Bot size={18} />
            </div>
            <div>
              <div className="font-semibold text-xs text-white">Camada Tática &amp; Robôs Autônomos</div>
              <div className="font-mono text-[11px] text-white/40">
                {gerenciasCount} gerências departamentais e {researchCount} robôs de pesquisa operando em paralelo.
              </div>
            </div>
          </div>
          <Link
            to="/automacoes"
            className="flex items-center gap-1.5 rounded-full border border-jarvis-cyan/30 bg-jarvis-cyan/10 px-3.5 py-1.5 font-mono text-xs font-semibold text-jarvis-cyanBright hover:bg-jarvis-cyan/20 transition-all"
          >
            <span>Ver em Automações</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
