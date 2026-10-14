import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Maximize2,
  Camera,
  Crosshair,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { GlassPanel } from "../common/GlassPanel";
import { useJarvisStore } from "../../state/store";
import type { CalibrationCorner, CalibrationQuad, Point2D } from "@jarvis/shared";
import { detectProjectedSurface } from "../../lib/projection/surfaceDetector";

interface CalibrationWizardProps {
  onClose?: () => void;
  videoElement?: HTMLVideoElement | null;
}

export function CalibrationWizard({ onClose, videoElement }: CalibrationWizardProps) {
  const [step, setStep] = useState(1);
  const surfaceProfiles = useJarvisStore((s) => s.surfaceProfiles);
  const activeProfileId = useJarvisStore((s) => s.activeProfileId);
  const activeProfile = surfaceProfiles[activeProfileId];
  const setSurfaceQuad = useJarvisStore((s) => s.setSurfaceQuad);
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const setCameraRequested = useJarvisStore((s) => s.setCameraRequested);
  const dominantHand = useJarvisStore((s) => s.dominantHand);
  const hand = useJarvisStore((s) => s.hands[dominantHand]);
  const pointerPosition = useJarvisStore((s) => s.pointerPosition);
  const projectorPointerPosition = useJarvisStore((s) => s.projectorPointerPosition);

  // Local editable quad state
  const [quad, setQuad] = useState<CalibrationQuad>(
    activeProfile?.quad || {
      topLeft: { x: 0.1, y: 0.1 },
      topRight: { x: 0.9, y: 0.1 },
      bottomRight: { x: 0.9, y: 0.9 },
      bottomLeft: { x: 0.1, y: 0.9 },
    }
  );

  const [activeCorner, setActiveCorner] = useState<CalibrationCorner | null>(null);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetectMessage, setAutoDetectMessage] = useState<string | null>(null);

  // Step 6 Interactive Target state
  const [targetHit, setTargetHit] = useState(false);
  const [pinchSuccess, setPinchSuccess] = useState(false);

  // Target button position in projector coordinates
  const testTarget = { x: 0.5, y: 0.5, radius: 0.12 };

  // Check cursor vs target in Step 6
  useEffect(() => {
    if (step === 6 && projectorPointerPosition) {
      const dx = projectorPointerPosition.x - testTarget.x;
      const dy = projectorPointerPosition.y - testTarget.y;
      const dist = Math.hypot(dx, dy);
      const isOver = dist < testTarget.radius;
      setTargetHit(isOver);

      if (isOver && hand?.pinch.active) {
        setPinchSuccess(true);
      }
    }
  }, [step, projectorPointerPosition, hand?.pinch.active]);

  const handleCornerDrag = (corner: CalibrationCorner, clientX: number, clientY: number, containerRect: DOMRect) => {
    const normX = Math.max(0, Math.min(1, (clientX - containerRect.left) / containerRect.width));
    const normY = Math.max(0, Math.min(1, (clientY - containerRect.top) / containerRect.height));

    const updated = {
      ...quad,
      [corner]: { x: Number(normX.toFixed(3)), y: Number(normY.toFixed(3)) },
    };
    setQuad(updated);
    setSurfaceQuad(updated);
  };

  const handleAutoDetect = () => {
    if (!videoElement) {
      setAutoDetectMessage("Câmera indisponível para detecção automática.");
      return;
    }
    setAutoDetecting(true);
    setAutoDetectMessage("Analisando contraste da superfície...");

    setTimeout(() => {
      const detected = detectProjectedSurface(videoElement);
      setAutoDetecting(false);
      if (detected) {
        setQuad(detected);
        setSurfaceQuad(detected);
        setAutoDetectMessage("Contornos da projeção detectados com sucesso!");
      } else {
        setAutoDetectMessage("Contorno não identificado com precisão. Ajuste os 4 pontos manualmente.");
      }
    }, 600);
  };

  const openProjectorWindow = () => {
    window.open(
      "/projector",
      "AuroraProjectorWindow",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-jarvis-accent/30 bg-jarvis-panel/95 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-jarvis-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-jarvis-accent/15 text-jarvis-accentBright">
              <Crosshair size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-white">Assistente de Calibração Aurora Vision</h2>
              <p className="text-xs text-white/50">Passo {step} de 7 — Alinhamento de Projeção & Gestos</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-jarvis-border px-3 py-1.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
            >
              Fechar
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-7 border-b border-jarvis-border/40 bg-black/20 text-center text-[11px]">
          {[
            "1. Projetor",
            "2. Câmera",
            "3. Superfície",
            "4. 4 Pontos",
            "5. Cursor",
            "6. Teste Pinça",
            "7. Concluir",
          ].map((title, i) => {
            const stepNum = i + 1;
            const isCurrent = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div
                key={title}
                onClick={() => setStep(stepNum)}
                className={`cursor-pointer py-2.5 transition-colors ${
                  isCurrent
                    ? "border-b-2 border-jarvis-accent font-semibold text-jarvis-accentBright bg-jarvis-accent/5"
                    : isDone
                      ? "text-jarvis-green"
                      : "text-white/30 hover:text-white/60"
                }`}
              >
                {isDone ? "✓ " : ""}
                {title}
              </div>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-5">
                <h3 className="mb-2 text-sm font-semibold text-white">Passo 1: Conecte e Abra a Janela de Projeção</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Para utilizar a projeção física, conecte o projetor externo ou monitor secundário ao seu computador.
                  Em seguida, abra a janela de projeção dedicada (Projector View) e arraste-a para a tela do projetor em modo tela cheia (Fullscreen).
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={openProjectorWindow}
                    className="flex items-center gap-2 rounded-lg bg-jarvis-accent px-4 py-2 text-xs font-semibold text-jarvis-bg hover:bg-jarvis-accentBright"
                  >
                    <ExternalLink size={14} /> Abrir Janela do Projetor (/projector)
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-5">
                <h3 className="mb-2 text-sm font-semibold text-white">Passo 2: Conecte e Ative a Câmera</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  A câmera deve estar apontada para a área da parede ou mesa onde a imagem é projetada.
                  Certifique-se de que a câmera captura toda a superfície iluminada pelo projetor.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setCameraRequested(!cameraActive)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold ${
                      cameraActive
                        ? "bg-jarvis-green/20 text-jarvis-green border border-jarvis-green/40"
                        : "bg-jarvis-accent text-jarvis-bg hover:bg-jarvis-accentBright"
                    }`}
                  >
                    <Camera size={14} /> {cameraActive ? "Câmera Ativa ✓" : "Ativar Câmera"}
                  </button>
                  <span className="text-xs text-white/50">
                    {cameraActive ? "Visão computacional em execução local" : "Aguardando ativação"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-5">
                <h3 className="mb-2 text-sm font-semibold text-white">Passo 3: Enquadre a Superfície de Projeção</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Posicione a câmera para que o retângulo projetado fique centralizado no campo de visão, sem oclusões.
                  O sistema de homografia ajustará qualquer inclinação ou perspectiva angular.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Passo 4: Marque os 4 Pontos da Área Projetada</h3>
                  <p className="text-xs text-white/60">
                    Arraste os marcadores azuis para os 4 cantos exatos da imagem projetada na visualização da câmera.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  disabled={!cameraActive || autoDetecting}
                  className="flex items-center gap-1.5 rounded-lg border border-jarvis-accent/40 bg-jarvis-accent/10 px-3 py-1.5 text-xs text-jarvis-accentBright hover:bg-jarvis-accent/20 disabled:opacity-40"
                >
                  <Sparkles size={13} /> {autoDetecting ? "Detectando..." : "Auto-Detectar"}
                </button>
              </div>

              {autoDetectMessage && (
                <div className="rounded-lg border border-jarvis-accent/30 bg-jarvis-accent/10 px-3 py-2 text-xs text-jarvis-accentBright">
                  {autoDetectMessage}
                </div>
              )}

              {/* Interactive 4-Corner Quad Canvas */}
              <div
                className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-xl border border-jarvis-accent/40 bg-black"
                onPointerMove={(e) => {
                  if (activeCorner) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleCornerDrag(activeCorner, e.clientX, e.clientY, rect);
                  }
                }}
                onPointerUp={() => setActiveCorner(null)}
              >
                {/* Visual Quad Overlay SVG */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                  <polygon
                    points={`${quad.topLeft.x * 100}%,${quad.topLeft.y * 100}% ${quad.topRight.x * 100}%,${
                      quad.topRight.y * 100
                    }% ${quad.bottomRight.x * 100}%,${quad.bottomRight.y * 100}% ${quad.bottomLeft.x * 100}%,${
                      quad.bottomLeft.y * 100
                    }%`}
                    className="fill-jarvis-accent/15 stroke-jarvis-accentBright stroke-2 [stroke-dasharray:4_4]"
                  />
                </svg>

                {/* Draggable Corner Handles */}
                {(
                  [
                    { key: "topLeft", label: "P1 Superior Esq.", pt: quad.topLeft },
                    { key: "topRight", label: "P2 Superior Dir.", pt: quad.topRight },
                    { key: "bottomRight", label: "P3 Inferior Dir.", pt: quad.bottomRight },
                    { key: "bottomLeft", label: "P4 Inferior Esq.", pt: quad.bottomLeft },
                  ] as const
                ).map(({ key, label, pt }) => (
                  <div
                    key={key}
                    onPointerDown={() => setActiveCorner(key)}
                    style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-jarvis-accent shadow-[0_0_12px_#ff7a1a] hover:scale-125 transition-transform">
                      <span className="text-[10px] font-bold text-black">{key[0].toUpperCase()}</span>
                    </div>
                    <div className="absolute left-8 top-0 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-white/80">
                      {label} ({pt.x}, {pt.y})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-5">
                <h3 className="mb-2 text-sm font-semibold text-white">Passo 5: Teste o Cursor Holográfico</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Aponte com o dedo indicador em direção à superfície projetada. O cursor holográfico na tela e na projeção deve acompanhar seu dedo com precisão e suavidade.
                </p>
                <div className="mt-4 flex items-center gap-4 rounded-lg bg-black/40 p-3 font-mono text-xs text-white/80">
                  <span>Mão Dominante: {dominantHand === "right" ? "Direita" : "Esquerda"}</span>
                  <span>•</span>
                  <span>
                    Coordenadas Mapeadas: X:{" "}
                    {projectorPointerPosition ? Math.round(projectorPointerPosition.x * 100) : "--"}% Y:{" "}
                    {projectorPointerPosition ? Math.round(projectorPointerPosition.y * 100) : "--"}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-5">
                <h3 className="mb-2 text-sm font-semibold text-white">Passo 6: Teste o Gesto de Pinça (Seleção)</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Aponte para o botão holográfico alvo abaixo e una a ponta do polegar com o indicador (gesto de pinça).
                </p>

                {/* Target Sandbox Area */}
                <div className="relative mt-4 flex h-48 w-full items-center justify-center rounded-xl border border-jarvis-border/80 bg-black/50">
                  <div
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-6 transition-all duration-200 ${
                      pinchSuccess
                        ? "border-jarvis-green bg-jarvis-green/20 shadow-[0_0_30px_rgba(54,255,176,0.6)]"
                        : targetHit
                          ? "border-jarvis-accentBright bg-jarvis-accent/20 scale-105"
                          : "border-white/20 bg-white/5"
                    }`}
                  >
                    <CheckCircle2
                      size={28}
                      className={pinchSuccess ? "text-jarvis-green" : targetHit ? "text-jarvis-accentBright" : "text-white/40"}
                    />
                    <div className="text-center">
                      <div className="text-xs font-bold text-white">
                        {pinchSuccess
                          ? "✓ Interação Calibrada com Sucesso!"
                          : targetHit
                            ? "Agora faça o gesto de PINÇA"
                            : "Aponte o cursor para este alvo"}
                      </div>
                      <div className="text-[10px] text-white/50">
                        {pinchSuccess ? "Homografia e gestos validados" : "Junte polegar e indicador para clicar"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-jarvis-green/40 bg-jarvis-green/10 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-jarvis-green/20 text-jarvis-green">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-base font-bold text-white">Calibração Concluída com Sucesso!</h3>
                <p className="mt-2 text-xs text-white/70 max-w-md mx-auto">
                  A relação geométrica entre a câmera e o projetor foi configurada. O perfil de calibração foi salvo e o sistema AURORA VISION está pronto para uso.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-jarvis-accent px-6 py-2.5 text-xs font-bold text-jarvis-bg hover:bg-jarvis-accentBright"
                  >
                    Iniciar Experiência Holográfica
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-jarvis-border/80 px-6 py-4 bg-black/30">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-lg border border-jarvis-border px-4 py-2 text-xs text-white/70 hover:bg-white/5 disabled:opacity-30"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => {
              if (step < 7) {
                setStep((s) => s + 1);
              } else if (onClose) {
                onClose();
              }
            }}
            className="flex items-center gap-1.5 rounded-lg bg-jarvis-accent px-5 py-2 text-xs font-semibold text-jarvis-bg hover:bg-jarvis-accentBright"
          >
            {step === 7 ? "Concluir" : "Avançar"} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

