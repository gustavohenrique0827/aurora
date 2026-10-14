import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles, Cpu, BarChart3, Workflow, Rocket } from "lucide-react";
import { useJarvisStore } from "../../state/store";

export function PresentationDeck() {
  const presentationSlide = useJarvisStore((s) => s.presentationSlide);
  const totalSlides = useJarvisStore((s) => s.totalPresentationSlides);
  const nextSlide = useJarvisStore((s) => s.nextPresentationSlide);
  const prevSlide = useJarvisStore((s) => s.prevPresentationSlide);
  const setExperienceMode = useJarvisStore((s) => s.setExperienceMode);

  const slides = [
    {
      title: "AURORA VISION",
      subtitle: "Sistema Operacional de Inteligência Artificial Holográfica",
      icon: <Sparkles className="h-12 w-12 text-jarvis-accentBright" />,
      content: (
        <div className="space-y-4 text-center max-w-xl mx-auto">
          <p className="text-sm text-white/80 leading-relaxed">
            Bem-vindo ao futuro da computação espacial e interfaces físicas interativas. A Aurora transcende a tela convencional através de projeção de alta fidelidade, visão computacional e interação multimodal.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="rounded-xl border border-jarvis-border/60 bg-black/40 p-3">
              <div className="text-xs font-bold text-jarvis-accentBright">Projeção Espacial</div>
              <div className="text-[10px] text-white/50">Calibração de Homografia 4-Pontos</div>
            </div>
            <div className="rounded-xl border border-jarvis-border/60 bg-black/40 p-3">
              <div className="text-xs font-bold text-jarvis-green">Visão & Gestos</div>
              <div className="text-[10px] text-white/50">Rastreamento MediaPipe em Tempo Real</div>
            </div>
            <div className="rounded-xl border border-jarvis-border/60 bg-black/40 p-3">
              <div className="text-xs font-bold text-jarvis-amber">Voz Multimodal</div>
              <div className="text-[10px] text-white/50">Fusão Semântica Gesto + Fala</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "ARQUITETURA G-TECH AI OS",
      subtitle: "Diretoria de Agentes Autônomos Integrada",
      icon: <Cpu className="h-12 w-12 text-purple-400" />,
      content: (
        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-xs text-white/70 text-center">
            Uma diretoria completa de 10 IAs especializadas gerenciando operações, CRM, finanças e tecnologia de ponta a ponta.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
            {[
              { role: "CEO AI", desc: "Estratégia & Decisão", color: "text-amber-400" },
              { role: "CCO AI", desc: "Vendas & Negociações", color: "text-jarvis-green" },
              { role: "CFO AI", desc: "Finanças & Auditoria", color: "text-jarvis-accentBright" },
              { role: "CTO AI", desc: "Engenharia & Cloud", color: "text-purple-400" },
            ].map((a) => (
              <div key={a.role} className="rounded-xl border border-jarvis-border/80 bg-black/40 p-3 text-center">
                <div className={`text-xs font-bold ${a.color}`}>{a.role}</div>
                <div className="text-[10px] text-white/50 mt-1">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "DESEMPENHO & MÉTRICAS",
      subtitle: "Indicadores em Tempo Real Conectados ao SPY & n8n",
      icon: <BarChart3 className="h-12 w-12 text-jarvis-green" />,
      content: (
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl border border-jarvis-green/40 bg-jarvis-green/10 p-4">
              <div className="text-[11px] text-white/60">Crescimento de Receita</div>
              <div className="font-mono text-2xl font-bold text-jarvis-green mt-1">+142%</div>
            </div>
            <div className="rounded-2xl border border-jarvis-accent/40 bg-jarvis-accent/10 p-4">
              <div className="text-[11px] text-white/60">Leads Convertidos</div>
              <div className="font-mono text-2xl font-bold text-jarvis-accentBright mt-1">1.280</div>
            </div>
            <div className="rounded-2xl border border-jarvis-amber/40 bg-jarvis-amber/10 p-4">
              <div className="text-[11px] text-white/60">NPS dos Clientes</div>
              <div className="font-mono text-2xl font-bold text-jarvis-amber mt-1">94.8</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "AUTOMAÇÃO & WORKFLOWS",
      subtitle: "Orquestração Contínua de Processos",
      icon: <Workflow className="h-12 w-12 text-jarvis-accent" />,
      content: (
        <div className="space-y-3 max-w-xl mx-auto text-center">
          <p className="text-xs text-white/70">
            Mais de 50 automações ativas conectando WhatsApp (WAHA), Webhooks, Bancos de Dados e Modelos LLM sem intervenção manual.
          </p>
          <div className="rounded-xl border border-jarvis-border/60 bg-black/40 p-4 font-mono text-xs text-white/80">
            Tempo de resposta médio: <span className="text-jarvis-green font-bold">180ms</span> • Disponibilidade: <span className="text-jarvis-green font-bold">99.98%</span>
          </div>
        </div>
      ),
    },
    {
      title: "O FUTURO É AGORA",
      subtitle: "A Era da Inteligência Espacial",
      icon: <Rocket className="h-12 w-12 text-jarvis-accentBright" />,
      content: (
        <div className="space-y-4 text-center max-w-lg mx-auto">
          <p className="text-sm text-white/80 leading-relaxed">
            A Aurora Vision redefine a produtividade corporativa ao unir o poder da IA generativa com interação física no mundo real.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setExperienceMode("normal")}
              className="rounded-full bg-jarvis-accent px-6 py-2.5 text-xs font-bold text-jarvis-bg hover:bg-jarvis-accentBright shadow-[0_0_20px_rgba(255,122,26,0.1)]"
            >
              Concluir Apresentação
            </button>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[presentationSlide] || slides[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 p-8 backdrop-blur-2xl">
      {/* Top Bar */}
      <div className="flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-jarvis-accentBright">
          <span className="h-2 w-2 rounded-full bg-jarvis-accentBright animate-pulse" />
          <span>MODO APRESENTAÇÃO • AURORA VISION</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-white/50">
            Slide {presentationSlide + 1} / {totalSlides}
          </span>
          <button
            type="button"
            onClick={() => setExperienceMode("normal")}
            className="rounded-lg border border-jarvis-border p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Slide Card */}
      <div className="my-auto flex w-full max-w-4xl flex-col items-center rounded-3xl border border-jarvis-accent/30 bg-jarvis-panel/90 p-10 shadow-[0_0_80px_rgba(0,0,0,0.9),0_0_30px_rgba(255,122,26,0.15)]">
        <div className="mb-4">{current.icon}</div>
        <h1 className="text-2xl font-extrabold tracking-wider text-white sm:text-3xl text-center">
          {current.title}
        </h1>
        <p className="mt-1 mb-8 text-xs font-semibold tracking-widest text-jarvis-accentBright uppercase text-center">
          {current.subtitle}
        </p>

        <div className="w-full">{current.content}</div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={presentationSlide === 0}
          onClick={prevSlide}
          className="flex items-center gap-1 rounded-full border border-jarvis-border bg-black/40 px-4 py-2 text-xs text-white/80 hover:border-jarvis-accent disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Anterior
        </button>

        {/* Dots */}
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                presentationSlide === i ? "w-6 bg-jarvis-accentBright" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          disabled={presentationSlide === totalSlides - 1}
          onClick={nextSlide}
          className="flex items-center gap-1 rounded-full border border-jarvis-border bg-black/40 px-4 py-2 text-xs text-white/80 hover:border-jarvis-accent disabled:opacity-30"
        >
          Próximo <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

