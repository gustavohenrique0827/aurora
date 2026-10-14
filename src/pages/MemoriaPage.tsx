import { Brain, Database, ShieldCheck, Sparkles } from "lucide-react";
import { GlassPanel } from "../components/common/GlassPanel";

export function MemoriaPage() {
  const memoryModules = [
    { title: "Memória Semântica", desc: "Base de conhecimento vetorial e indexação RAG de documentos da empresa." },
    { title: "Memória Episódica", desc: "Histórico de conversas, decisões passadas e reuniões da diretoria." },
    { title: "Memória Operacional", desc: "Parâmetros de execução, preferências dos diretores e regras de negócio." },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5 font-sans">
      {/* Header */}
      <div className="mb-4 border-b border-jarvis-accent/15 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-lg font-bold tracking-wide text-white">Sistema de Memória</h1>
          <span className="rounded-full bg-jarvis-amber/20 border border-jarvis-amber/40 px-2.5 py-0.5 font-mono text-[10px] font-bold text-jarvis-amber">
            Em Implementação
          </span>
        </div>
        <p className="font-mono text-xs text-white/40">
          Arquitetura de Memória de Longo Prazo e Aprendizado Contínuo da Aurora
        </p>
      </div>

      <div className="max-w-3xl space-y-4">
        <GlassPanel title="Status da Arquitetura">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-jarvis-accent/30 bg-jarvis-accent/10 text-jarvis-accentBright">
              <Brain size={24} />
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-white/70">
              <p>
                O sistema de memória de longo prazo da Aurora (individual, compartilhada e episódica) está especificado para utilizar <strong>Supabase + pgvector</strong> com isolamento multi-tenant seguro.
              </p>
              <p className="text-white/40">
                Cada agente hoje opera de forma estritamente focada e em conformidade com as diretrizes de privacidade e governança de dados da G-TECH.
              </p>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-3 sm:grid-cols-3">
          {memoryModules.map((m, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-[#101114]/75 p-4 backdrop-blur-xl"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-jarvis-accentBright mb-2">
                <Database size={14} />
              </div>
              <div className="font-display text-xs font-bold text-white">{m.title}</div>
              <div className="mt-1 font-mono text-[10px] text-white/40 leading-relaxed">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
