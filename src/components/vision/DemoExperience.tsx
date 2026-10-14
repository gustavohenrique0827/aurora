import { useEffect, useState } from "react";
import { Sparkles, Mic, Camera, Hand, Tv, Brain, CheckCircle2, ArrowRight, X } from "lucide-react";
import { useJarvisStore } from "../../state/store";

export function DemoExperience() {
  const [step, setStep] = useState(0);
  const setExperienceMode = useJarvisStore((s) => s.setExperienceMode);
  const setSphereMode = useJarvisStore((s) => s.setSphereMode);

  const demoSteps = [
    {
      title: "1. Reconhecimento & Síntese de Voz",
      desc: "Olá, Gustavo! Eu sou a Aurora. Compreendo comandos de voz naturais e respondo em tempo real com síntese vocal avançada.",
      icon: <Mic className="h-8 w-8 text-jarvis-accentBright" />,
      action: () => setSphereMode("speaking"),
    },
    {
      title: "2. Visão Computacional em Tempo Real",
      desc: "Minha visão computacional local identifica suas mãos, palma e articulações dos dedos com alta precisão e latência mínima.",
      icon: <Camera className="h-8 w-8 text-jarvis-green" />,
      action: () => setSphereMode("thinking"),
    },
    {
      title: "3. Gestos Holográficos Espaciais",
      desc: "Você pode apontar para navegar o cursor, fazer gesto de pinça para clicar, arrastar janelas no ar ou passar telas com swipe.",
      icon: <Hand className="h-8 w-8 text-amber-400" />,
      action: () => setSphereMode("analyzing"),
    },
    {
      title: "4. Projeção & Calibração de Homografia",
      desc: "Posso ser projetada em qualquer superfície física: paredes, mesas ou vidro transparente com correção automática de perspectiva.",
      icon: <Tv className="h-8 w-8 text-purple-400" />,
      action: () => setSphereMode("executing"),
    },
    {
      title: "5. Inteligência Artificial Multimodal",
      desc: "Você pode apontar para um gráfico específico e dizer 'Aurora, analise esse'. Eu correlaciono seu gesto, posição e contexto instantaneamente.",
      icon: <Brain className="h-8 w-8 text-jarvis-accentBright" />,
      action: () => setSphereMode("success"),
    },
  ];

  const current = demoSteps[step] || demoSteps[0];

  useEffect(() => {
    current.action();
  }, [step]);

  const handleNext = () => {
    if (step < demoSteps.length - 1) {
      setStep((s) => s + 1);
    } else {
      setSphereMode("idle");
      setExperienceMode("normal");
    }
  };

  const handleClose = () => {
    setSphereMode("idle");
    setExperienceMode("normal");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-xl">
      <div className="relative flex w-full max-w-xl flex-col items-center rounded-3xl border border-jarvis-accent/40 bg-jarvis-panel/95 p-8 text-center shadow-[0_0_60px_rgba(255,122,26,0.1)]">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg border border-jarvis-border p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-jarvis-accent/40 bg-jarvis-accent/10">
          {current.icon}
        </div>

        <span className="font-mono text-[10px] font-bold tracking-widest text-jarvis-accentBright uppercase">
          DEMONSTRAÇÃO DE CAPACIDADES DA AURORA
        </span>
        <h2 className="mt-1 text-xl font-extrabold text-white">{current.title}</h2>
        <p className="mt-4 text-xs text-white/80 leading-relaxed max-w-md">{current.desc}</p>

        {/* Stepper Dots */}
        <div className="my-6 flex gap-2">
          {demoSteps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                step === i ? "w-6 bg-jarvis-accentBright" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 rounded-full bg-jarvis-accent px-6 py-2.5 text-xs font-bold text-jarvis-bg hover:bg-jarvis-accentBright shadow-[0_0_20px_rgba(255,122,26,0.1)]"
        >
          {step === demoSteps.length - 1 ? "Concluir Demonstração" : "Avançar"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

