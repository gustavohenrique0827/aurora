import { useState, useEffect } from "react";
import {
  Sliders,
  Tv,
  Presentation,
  Sparkles,
  Camera,
  Plus,
  ExternalLink,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
  Menu,
  MessageCircle,
} from "lucide-react";
import { EnergySphere } from "../components/sphere/EnergySphere";
import { SpatialWindowManager } from "../components/vision/SpatialWindowManager";
import { HolographicCursor } from "../components/vision/HolographicCursor";
import { MultimodalHighlight } from "../components/vision/MultimodalHighlight";
import { PresentationDeck } from "../components/vision/PresentationDeck";
import { DemoExperience } from "../components/vision/DemoExperience";
import { CalibrationWizard } from "../components/vision/CalibrationWizard";
import { DeviceManagerModal } from "../components/vision/DeviceManagerModal";
import { SurfaceSettingsPanel } from "../components/vision/SurfaceSettingsPanel";
import { CameraPermissionGate } from "../components/vision/CameraPermissionGate";
import { AgentDetailPanel } from "../components/sphere/aurora/AgentDetailPanel";
import { AuroraRail } from "../components/aurora/AuroraRail";
import { AuroraChatPanel } from "../components/aurora/AuroraChatPanel";
import { AuroraBackdrop } from "../components/aurora/AuroraBackdrop";
import { useJarvisStore } from "../state/store";
import { useVoiceAgent } from "../hooks/voiceAgentContext";
import { useJarvisChat } from "../hooks/useJarvisChat";
import { usePersistedToggle } from "../hooks/usePersistedToggle";
import { api } from "../lib/api";
import type { SpatialWindowType, SurfaceMode } from "@jarvis/shared";

export function AuroraPage() {
  const setActiveDirectorId = useJarvisStore((s) => s.setActiveDirectorId);
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const setCameraRequested = useJarvisStore((s) => s.setCameraRequested);
  const privacyMode = useJarvisStore((s) => s.privacyMode);
  const setPrivacyMode = useJarvisStore((s) => s.setPrivacyMode);
  const trackingFps = useJarvisStore((s) => s.trackingFps);
  const detectionLatencyMs = useJarvisStore((s) => s.detectionLatencyMs);
  const experienceMode = useJarvisStore((s) => s.experienceMode);
  const setExperienceMode = useJarvisStore((s) => s.setExperienceMode);
  const addSpatialWindow = useJarvisStore((s) => s.addSpatialWindow);
  const surfaceProfiles = useJarvisStore((s) => s.surfaceProfiles);
  const activeProfileId = useJarvisStore((s) => s.activeProfileId);
  const setActiveProfile = useJarvisStore((s) => s.setActiveProfile);
  const sphereMode = useJarvisStore((s) => s.sphereMode);
  const isListening = useJarvisStore((s) => s.isListening);

  const activeProfile = surfaceProfiles[activeProfileId];
  const setAuthenticated = useJarvisStore((s) => s.setAuthenticated);

  const [showCalibration, setShowCalibration] = useState(false);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [showSurfaceSettings, setShowSurfaceSettings] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [railOpen, toggleRail] = usePersistedToggle("aurora.rail.open", false);
  const [chatOpen, toggleChat, setChatOpen] = usePersistedToggle(
    "aurora.chat.open",
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  const mobileNavOpen = useJarvisStore((s) => s.mobileNavOpen);
  const toggleMobileNav = useJarvisStore((s) => s.toggleMobileNav);
  const setMobileNavOpen = useJarvisStore((s) => s.setMobileNavOpen);
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const setOpenedAgentKey = useJarvisStore((s) => s.setOpenedAgentKey);
  const brainOpen = useJarvisStore((s) => s.brainOpen);
  const setBrainOpen = useJarvisStore((s) => s.setBrainOpen);

  // handleComposerSend (not a bare sendMessage) so a typed message also unlocks audio playback
  // in the same user gesture — otherwise the browser silently blocks Aurora's spoken reply.
  const { startPushToTalk, stopPushToTalk, handleComposerSend } = useVoiceAgent();
  const { messages, isAwaitingResponse } = useJarvisChat();

  useEffect(() => {
    setActiveDirectorId(null);
  }, [setActiveDirectorId]);

  useEffect(
    () => () => {
      setOpenedAgentKey(null);
      setBrainOpen(false);
    },
    [setOpenedAgentKey, setBrainOpen]
  );

  const openProjectorWindow = () => {
    window.open(
      "/projector",
      "AuroraProjectorWindow",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setAuthenticated(false);
  };

  const windowOptions: Array<{ type: SpatialWindowType; label: string; icon: string }> = [
    { type: "vendas", label: "Vendas & Desempenho", icon: "📈" },
    { type: "crm", label: "CRM & Leads (SPY)", icon: "👥" },
    { type: "financeiro", label: "Painel Financeiro", icon: "💰" },
    { type: "projetos", label: "Projetos & Tarefas", icon: "📋" },
    { type: "automacoes", label: "Workflows n8n", icon: "⚡" },
    { type: "waha", label: "WhatsApp (WAHA)", icon: "💬" },
  ];

  const railWidth = railOpen ? 224 : 76;
  const toolBtn =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white";
  const toolLabel = "px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-white/35";

  return (
    <div className="relative h-full select-none overflow-hidden bg-[#050403] font-sans">
      <AuroraBackdrop />
      {/* Stage: Aurora + holographic base. Shrinks to make room while the chat panel is open. */}
      <div
        className={`absolute inset-0 md:left-24 lg:left-0 lg:transition-[right] lg:duration-300 ${chatOpen ? "lg:right-[440px]" : ""}`}
      >
        {/* Holographic base rings under her shoulders */}
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[10%] left-1/2 w-[min(78%,900px)] -translate-x-1/2">
          <div className="relative aspect-[7/1]">
            <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,150,60,0.4),rgba(255,122,26,0.14)_55%,transparent_72%)] blur-xl" />
            <div className="absolute inset-0 rounded-[50%] border-[3px] border-jarvis-accentBright/90 shadow-[0_0_28px_rgba(255,122,26,0.7),inset_0_0_24px_rgba(255,122,26,0.35)]" />
            <div className="absolute inset-[14%] rounded-[50%] border-2 border-jarvis-accent/80 shadow-[0_0_24px_rgba(255,122,26,0.6),inset_0_0_18px_rgba(255,122,26,0.3)]" />
            <div className="absolute -inset-x-[8%] -inset-y-[30%] rounded-[50%] border border-jarvis-accentBright/35" />
            <div className="absolute -inset-x-[16%] -inset-y-[55%] rounded-[50%] border border-jarvis-accent/20" />
          </div>
        </div>

        {/* Central 3D Aurora */}
        <div className="absolute inset-0 z-10">
          <EnergySphere cameraZ={4.5} />
        </div>

        <SpatialWindowManager />
        <MultimodalHighlight />
        <HolographicCursor />

        {/* Greeting */}
        <div
          className="pointer-events-none absolute top-[36%] z-20 hidden transition-[left] duration-200 lg:block"
          style={{ left: railWidth + 64 }}
        >
          <div className="mb-5 h-px w-14 bg-jarvis-accent/70" />
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
            Olá, <span className="text-jarvis-accent">Gustavo</span>.
          </h1>
          <p className="mt-2 text-lg text-white/80">Como posso te ajudar hoje?</p>
          <div className="mt-5 h-px w-14 bg-jarvis-accent/70" />
        </div>

        {/* Agent dock + detail card for the neuron tapped inside Aurora's head */}
        <AgentDetailPanel
          onAsk={(text) => {
            setChatOpen(true);
            setPrefill({ text, nonce: Date.now() });
          }}
        />

        {showSurfaceSettings && (
          <div className="absolute right-6 top-24 z-50 w-80 max-w-sm">
            <SurfaceSettingsPanel onOpenCalibration={() => setShowCalibration(true)} />
          </div>
        )}
      </div>

      {/* Top chrome: brand (left) and tools + user (right) */}
      <header className="pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center justify-between sm:inset-x-5 sm:top-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleMobileNav}
            aria-label="Abrir menu"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur-xl md:hidden"
          >
            <Menu size={19} />
          </button>
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-jarvis-accent/60 bg-black/40 sm:h-12 sm:w-12">
            <span
              className={`h-4 w-4 rounded-full ${
                sphereMode === "analyzing"
                  ? "animate-ping bg-purple-400"
                  : isListening
                    ? "animate-ping bg-jarvis-accentBright"
                    : "bg-jarvis-accent shadow-[0_0_12px_#ff7a1a]"
              }`}
            />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="font-display text-xl font-semibold tracking-[0.18em] text-white">AURORA</div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-jarvis-accent">AI OS</div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <CameraPermissionGate />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTools(!showTools)}
              aria-expanded={showTools}
              className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3.5 text-xs font-medium text-white/80 backdrop-blur-xl transition-colors hover:border-jarvis-accent/50 hover:text-white"
              aria-label="Ferramentas"
            >
              <SlidersHorizontal size={16} /> <span className="hidden sm:inline">Ferramentas</span>
              <ChevronDown size={12} className="hidden text-white/40 sm:block" />
            </button>

            {showTools && (
              <div className="absolute right-0 top-full z-50 mt-2 max-h-[75dvh] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0c10]/95 p-2 shadow-2xl backdrop-blur-2xl">
                <div className={toolLabel}>Superfície · {activeProfile?.name || "Modo Parede"}</div>
                {Object.values(surfaceProfiles).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProfile(p.id as SurfaceMode)}
                    className={`${toolBtn} ${p.id === activeProfileId ? "bg-jarvis-accent/15 font-semibold text-jarvis-accentBright" : ""}`}
                  >
                    <span className="flex-1">{p.name}</span>
                    {p.id === activeProfileId && <span className="h-1.5 w-1.5 rounded-full bg-jarvis-accentBright" />}
                  </button>
                ))}

                <div className={toolLabel}>Adicionar painel</div>
                {windowOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      addSpatialWindow(opt.type, opt.label);
                      setShowTools(false);
                    }}
                    className={toolBtn}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}

                <div className={toolLabel}>Experiência</div>
                <button
                  type="button"
                  onClick={() => {
                    setExperienceMode(experienceMode === "presentation" ? "normal" : "presentation");
                    setShowTools(false);
                  }}
                  className={`${toolBtn} ${experienceMode === "presentation" ? "bg-jarvis-accent/15 text-jarvis-accentBright" : ""}`}
                >
                  <Presentation size={14} /> Apresentação
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExperienceMode(experienceMode === "demo" ? "normal" : "demo");
                    setShowTools(false);
                  }}
                  className={`${toolBtn} ${experienceMode === "demo" ? "bg-jarvis-accent/15 text-jarvis-accentBright" : ""}`}
                >
                  <Sparkles size={14} /> Demo
                </button>

                <div className={toolLabel}>Visão</div>
                <button type="button" onClick={() => setCameraRequested(!cameraActive)} className={toolBtn}>
                  <Camera size={14} /> {cameraActive ? `Câmera ativa · ${trackingFps.toFixed(0)} FPS` : "Câmera desligada"}
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={`${toolBtn} ${privacyMode ? "text-jarvis-amber" : ""}`}
                >
                  <Shield size={14} /> Modo privacidade {privacyMode ? "(ligado)" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalibration(true);
                    setShowTools(false);
                  }}
                  className={toolBtn}
                >
                  Calibrar 4 pontos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSurfaceSettings(!showSurfaceSettings);
                    setShowTools(false);
                  }}
                  className={toolBtn}
                >
                  <Sliders size={14} /> Ajustes de projeção
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeviceManager(true);
                    setShowTools(false);
                  }}
                  className={toolBtn}
                >
                  <Tv size={14} /> Dispositivos (câmera, projetor, áudio)
                </button>
                <button type="button" onClick={openProjectorWindow} className={toolBtn}>
                  <ExternalLink size={14} /> Abrir projetor em outra tela
                </button>
                <div className="mt-1 border-t border-white/10 px-3 pt-2 text-[10px] text-white/35">
                  {detectionLatencyMs > 0 ? `Latência de detecção ${detectionLatencyMs.toFixed(0)} ms` : "Visão sem telemetria"}
                </div>
              </div>
            )}
          </div>

          <div className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-black/45 pl-1.5 pr-3 backdrop-blur-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-jarvis-accent to-jarvis-accentBright text-[11px] font-bold text-black">
              GH
            </div>
            <span className="hidden text-xs font-semibold text-white sm:inline">Gustavo H.</span>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair do sistema"
              aria-label="Sair do sistema"
              className="text-white/40 transition-colors hover:text-jarvis-red"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <AuroraRail
        open={railOpen || mobileNavOpen}
        onToggle={toggleRail}
        onNavigate={() => setMobileNavOpen(false)}
        className={
          mobileNavOpen
            ? "fixed bottom-5 left-5 top-5 z-50 flex"
            : "absolute bottom-5 left-5 top-24 z-30 hidden md:flex"
        }
      />

      {/* Chat open/close handle, riding the edge of the stage */}
      <button
        type="button"
        onClick={toggleChat}
        aria-expanded={chatOpen}
        aria-label={chatOpen ? "Fechar conversa" : "Abrir conversa"}
        title={chatOpen ? "Fechar conversa" : "Abrir conversa"}
        className={`absolute top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-xl transition-[right] duration-300 hover:border-jarvis-accent/60 lg:flex ${
          chatOpen ? "right-[444px]" : "right-5"
        }`}
      >
        {chatOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      {!chatOpen && (
        <button
          type="button"
          onClick={toggleChat}
          className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-jarvis-accent/50 bg-black/70 px-5 text-sm font-medium text-white backdrop-blur-xl lg:hidden"
        >
          <MessageCircle size={18} className="text-jarvis-accent" /> Conversar com a Aurora
        </button>
      )}

      <AuroraChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        isAwaitingResponse={isAwaitingResponse}
        onSend={handleComposerSend}
        startPushToTalk={startPushToTalk}
        stopPushToTalk={stopPushToTalk}
        prefill={prefill}
      />

      {experienceMode === "presentation" && <PresentationDeck />}
      {experienceMode === "demo" && <DemoExperience />}
      {showCalibration && <CalibrationWizard onClose={() => setShowCalibration(false)} />}
      {showDeviceManager && (
        <DeviceManagerModal
          onClose={() => setShowDeviceManager(false)}
          onOpenCalibration={() => {
            setShowDeviceManager(false);
            setShowCalibration(true);
          }}
        />
      )}
    </div>
  );
}
