import { useState, useEffect, useRef } from "react";
import {
  Sliders,
  Tv,
  Presentation,
  Sparkles,
  Camera,
  Plus,
  ExternalLink,
  Shield,
  Mic,
  Send,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Maximize2,
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
import { AgentDetailPanel } from "../components/sphere/aurora/AgentDetailPanel";
import { useJarvisStore } from "../state/store";
import { useVoiceAgent } from "../hooks/voiceAgentContext";
import { WakeWordToggle } from "../components/voice/WakeWordToggle";
import { ConversationCard } from "../components/aurora/ConversationCard";
import { useJarvisChat } from "../hooks/useJarvisChat";
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

  const [showCalibration, setShowCalibration] = useState(false);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [showSurfaceSettings, setShowSurfaceSettings] = useState(false);
  const [showWindowMenu, setShowWindowMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [typedMessage, setTypedMessage] = useState("");
  // Whole chat card open/closed (conversation + suggestions + camera row); closed leaves only
  // the input row. Remembered per viewer.
  const [chatCardOpen, setChatCardOpen] = useState(() => {
    try {
      return localStorage.getItem("aurora.chatCard.open") !== "0";
    } catch {
      return true;
    }
  });
  const toggleChatCard = () =>
    setChatCardOpen((o) => {
      try {
        localStorage.setItem("aurora.chatCard.open", o ? "0" : "1");
      } catch {
        /* per-viewer convenience only */
      }
      return !o;
    });
  const promptInputRef = useRef<HTMLInputElement>(null);
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

  const handleSendPrompt = (textToSend?: string) => {
    const query = (textToSend || typedMessage).trim();
    if (!query) return;
    handleComposerSend(query);
    setTypedMessage("");
  };

  const windowOptions: Array<{ type: SpatialWindowType; label: string; icon: string }> = [
    { type: "vendas", label: "Vendas & Desempenho", icon: "📈" },
    { type: "crm", label: "CRM & Leads (SPY)", icon: "👥" },
    { type: "financeiro", label: "Painel Financeiro", icon: "💰" },
    { type: "projetos", label: "Projetos & Tarefas", icon: "📋" },
    { type: "automacoes", label: "Workflows n8n", icon: "⚡" },
    { type: "waha", label: "WhatsApp (WAHA)", icon: "💬" },
  ];

  const quickPrompts = [
    "Abra o painel de vendas",
    "Qual o status do funil de leads?",
    "Iniciar apresentação",
    "Status dos workflows",
  ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#08090b] select-none font-sans">
      {/* Subtle Holographic Grid Accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-jarvis-accent/5 via-transparent to-transparent" />

      {/* 1. Floating Holographic Top HUD */}
      <header className="pointer-events-none absolute top-3 left-4 right-4 z-30 flex items-center justify-between">
        {/* Left: Telemetry & Surface Mode Selector */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-full border border-jarvis-accent/30 bg-black/60 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_0_20px_rgba(255,122,26,0.12)]">
            <span
              className={`h-2 w-2 rounded-full ${
                sphereMode === "analyzing"
                  ? "bg-purple-400 animate-ping"
                  : isListening
                    ? "bg-jarvis-accentBright animate-ping"
                    : "bg-jarvis-accent shadow-[0_0_8px_#ff7a1a]"
              }`}
            />
            <span className="font-mono text-xs font-bold tracking-widest text-white">AURORA</span>
            <span className="h-3 w-[1px] bg-white/20" />
            <span className="font-mono text-[10px] uppercase text-white/50">{sphereMode}</span>
          </div>

          {/* Surface Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 rounded-full border border-jarvis-border/80 bg-black/50 px-3 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur-lg hover:border-jarvis-accent/50 hover:text-white transition-colors"
            >
              <span className="text-jarvis-accentBright">SUPERFÍCIE:</span>
              <span>{activeProfile?.name || "Modo Parede"}</span>
              <ChevronDown size={12} className="text-white/40" />
            </button>

            {showProfileMenu && (
              <div className="absolute left-0 top-full mt-2 z-50 w-52 rounded-2xl border border-jarvis-accent/30 bg-black/90 p-2 shadow-2xl backdrop-blur-2xl">
                {Object.values(surfaceProfiles).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveProfile(p.id as SurfaceMode);
                      setShowProfileMenu(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-mono transition-colors ${
                      p.id === activeProfileId
                        ? "bg-jarvis-accent/20 text-jarvis-accentBright font-bold"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{p.name}</span>
                    {p.id === activeProfileId && <span className="h-1.5 w-1.5 rounded-full bg-jarvis-accentBright" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Floating Holographic Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Add Spatial Window Capsule */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWindowMenu(!showWindowMenu)}
              className="flex items-center gap-1.5 rounded-full border border-jarvis-accent/40 bg-jarvis-accent/15 px-3.5 py-1.5 text-xs font-semibold text-jarvis-accentBright backdrop-blur-md hover:bg-jarvis-accent/25 transition-all shadow-[0_0_15px_rgba(255,122,26,0.15)]"
            >
              <Plus size={13} /> Painel
            </button>

            {showWindowMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-jarvis-accent/30 bg-black/90 p-2 shadow-2xl backdrop-blur-2xl">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-white/40">
                  Painéis Holográficos
                </div>
                {windowOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      addSpatialWindow(opt.type, opt.label);
                      setShowWindowMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-white/80 hover:bg-jarvis-accent/20 hover:text-white transition-colors"
                  >
                    <span>{opt.icon}</span>
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Presentation Mode Button */}
          <button
            type="button"
            onClick={() => setExperienceMode(experienceMode === "presentation" ? "normal" : "presentation")}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all ${
              experienceMode === "presentation"
                ? "border-jarvis-accentBright bg-jarvis-accentBright/30 text-white shadow-[0_0_15px_rgba(255,122,26,0.1)]"
                : "border-jarvis-border/80 bg-black/50 text-white/70 hover:border-jarvis-accent/50 hover:text-white"
            }`}
          >
            <Presentation size={13} /> Apresentação
          </button>

          {/* Demo Experience Button */}
          <button
            type="button"
            onClick={() => setExperienceMode(experienceMode === "demo" ? "normal" : "demo")}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all ${
              experienceMode === "demo"
                ? "border-yellow-400 bg-yellow-400/25 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]"
                : "border-jarvis-border/80 bg-black/50 text-white/70 hover:border-yellow-400/50 hover:text-white"
            }`}
          >
            <Sparkles size={13} /> Demo
          </button>

          {/* Calibration Wizard Button */}
          <button
            type="button"
            onClick={() => setShowCalibration(true)}
            className="flex items-center gap-1.5 rounded-full border border-jarvis-border/80 bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md hover:border-jarvis-accent/50 hover:text-white transition-colors"
            title="Calibração Geométrica de 4 Pontos"
          >
            Calibrar 4P
          </button>

          {/* Surface Settings Drawer */}
          <button
            type="button"
            onClick={() => setShowSurfaceSettings(!showSurfaceSettings)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-jarvis-border/80 bg-black/50 text-white/70 backdrop-blur-md hover:border-jarvis-accent/50 hover:text-white transition-colors"
            title="Ajustes de Projeção & Keystone"
          >
            <Sliders size={14} />
          </button>

          {/* Device Manager Modal */}
          <button
            type="button"
            onClick={() => setShowDeviceManager(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-jarvis-border/80 bg-black/50 text-white/70 backdrop-blur-md hover:border-jarvis-accent/50 hover:text-white transition-colors"
            title="Gerenciador de Hardware (Câmera, Projetor, Áudio)"
          >
            <Tv size={14} />
          </button>

          {/* External Projector Window Launcher */}
          <button
            type="button"
            onClick={openProjectorWindow}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-jarvis-accent to-jarvis-accentBright px-3.5 py-1.5 text-xs font-bold text-black hover:brightness-110 shadow-[0_0_18px_rgba(255,122,26,0.12)] transition-all"
            title="Abrir tela cheia do projetor em monitor secundário"
          >
            <ExternalLink size={12} /> Projetor
          </button>
        </div>
      </header>

      {/* 2. Main 3D Stage & Holographic Core */}
      <div className="relative flex-1 overflow-hidden">
        {/* Central 3D Aurora Energy Sphere */}
        <div className="absolute inset-0 z-0">
          <EnergySphere />
        </div>

        {/* Spatial Windows Floating in 3D Space (Clean, opened on demand) */}
        <SpatialWindowManager />

        {/* Multimodal Target Highlight Reticle */}
        <MultimodalHighlight />

        {/* Holographic Cursor with Ring Telemetry */}
        <HolographicCursor />

        {/* Floating Voice Transcript & State Overlay */}

        {/* Greeting under her before the first exchange; the conversation itself lives in the
            ConversationCard above the chat bar. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-36 z-20 flex justify-center px-4">
          {messages.length === 0 && !isAwaitingResponse ? (
            <p
              className={`text-center font-display text-lg font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-jarvis-accentBright via-white to-fuchsia-300 transition-opacity duration-500 sm:text-2xl ${
                sphereMode === "idle" && !isListening && !brainOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              Bem-vindo, como posso ajudar hoje?
            </p>
          ) : null}
        </div>

        {/* Agent legend + detail card for the neuron tapped inside Aurora's head */}
        <AgentDetailPanel
          onAsk={(text) => {
            setTypedMessage(text);
            requestAnimationFrame(() => promptInputRef.current?.focus());
          }}
        />

        {/* Sci-Fi Corner Brackets */}
        <div className="pointer-events-none absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-jarvis-accent/30" />
        <div className="pointer-events-none absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-jarvis-accent/30" />
        <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-jarvis-accent/30" />
        <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-jarvis-accent/30" />

        {/* Surface Settings Drawer */}
        {showSurfaceSettings && (
          <div className="absolute left-6 top-16 z-50 w-80 max-w-sm">
            <SurfaceSettingsPanel onOpenCalibration={() => setShowCalibration(true)} />
          </div>
        )}
      </div>

      {/* 3. Floating Bottom Conversational Neural Terminal & Action Dock */}
      <footer className="pointer-events-none absolute bottom-3 left-4 right-4 z-30 flex flex-col items-center gap-2">
        {/* Central Conversational Prompt & Voice Capsule */}
        <div className="pointer-events-auto w-full max-w-2xl">
          <div className="rounded-2xl border border-jarvis-accent/35 bg-black/80 p-2 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,122,26,0.15)]">
            {chatCardOpen && (
            <ConversationCard
              messages={messages}
              isAwaitingResponse={isAwaitingResponse}
              onEdit={(text) => {
                setTypedMessage(text);
                requestAnimationFrame(() => promptInputRef.current?.focus());
              }}
            />
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              {/* Push to Talk Voice Button */}
              <button
                type="button"
                onPointerDown={() => startPushToTalk()}
                onPointerUp={() => stopPushToTalk()}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  isListening
                    ? "border-jarvis-accentBright bg-jarvis-accentBright text-black shadow-[0_0_20px_rgba(255,122,26,0.1)] animate-pulse"
                    : "border-jarvis-accent/40 bg-jarvis-accent/15 text-jarvis-accentBright hover:bg-jarvis-accent/30"
                }`}
                title="Segure para falar por voz"
              >
                <Mic size={18} />
              </button>

              <input
                ref={promptInputRef}
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Fale ou digite um comando para a Aurora..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />

              {/* Wake-word state lives in the bar, so a self-disabled listener never fails silently. */}
              <WakeWordToggle compact />

              <button
                type="submit"
                disabled={!typedMessage.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-jarvis-accent to-jarvis-accentBright text-black transition-all hover:brightness-110 disabled:opacity-30"
                title="Enviar mensagem"
              >
                <Send size={15} />
              </button>

              <button
                type="button"
                onClick={toggleChatCard}
                aria-expanded={chatCardOpen}
                className="flex h-10 w-7 shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/5 hover:text-white"
                title={chatCardOpen ? "Fechar card (conversa e sugestões)" : "Abrir card (conversa e sugestões)"}
                aria-label={chatCardOpen ? "Fechar card da conversa" : "Abrir card da conversa"}
              >
                {chatCardOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </form>

            {/* Quick Action Suggestion Chips */}
            {chatCardOpen && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/10 pt-2 px-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {quickPrompts.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendPrompt(p)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-white/70 hover:border-jarvis-accent/50 hover:bg-jarvis-accent/10 hover:text-white transition-colors"
                  >
                    <span>{p}</span>
                    <ArrowRight size={10} className="text-jarvis-accent" />
                  </button>
                ))}
              </div>

              {/* Vision Camera Status Mini Pill */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraRequested(!cameraActive)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold transition-colors ${
                    cameraActive
                      ? "bg-jarvis-green/20 text-jarvis-green border border-jarvis-green/40"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  <Camera size={10} /> {cameraActive ? `${trackingFps.toFixed(0)} FPS` : "CÂMERA OFF"}
                </button>

                <button
                  type="button"
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={`p-1 rounded-full transition-colors ${
                    privacyMode ? "text-jarvis-amber bg-jarvis-amber/20" : "text-white/40 hover:text-white"
                  }`}
                  title="Modo Privacidade"
                >
                  <Shield size={12} />
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      </footer>

      {/* Presentation Deck Overlay */}
      {experienceMode === "presentation" && <PresentationDeck />}

      {/* Demo Experience Overlay */}
      {experienceMode === "demo" && <DemoExperience />}

      {/* Calibration Wizard Modal */}
      {showCalibration && <CalibrationWizard onClose={() => setShowCalibration(false)} />}

      {/* Device Manager Modal */}
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
