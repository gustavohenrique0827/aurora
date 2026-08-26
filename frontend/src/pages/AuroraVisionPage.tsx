import { useState, useRef, useEffect } from "react";
import {
  Sliders,
  Tv,
  Presentation,
  Sparkles,
  Camera,
  Layers,
  Plus,
  Moon,
  Maximize2,
  ExternalLink,
  Shield,
  Activity,
} from "lucide-react";
import { EnergySphere } from "../components/sphere/EnergySphere";
import { TranscriptOverlay } from "../components/voice/TranscriptOverlay";
import { SpatialWindowManager } from "../components/vision/SpatialWindowManager";
import { HolographicCursor } from "../components/vision/HolographicCursor";
import { MultimodalHighlight } from "../components/vision/MultimodalHighlight";
import { PresentationDeck } from "../components/vision/PresentationDeck";
import { DemoExperience } from "../components/vision/DemoExperience";
import { CalibrationWizard } from "../components/vision/CalibrationWizard";
import { DeviceManagerModal } from "../components/vision/DeviceManagerModal";
import { SurfaceSettingsPanel } from "../components/vision/SurfaceSettingsPanel";
import { useJarvisStore } from "../state/store";
import type { SpatialWindowType } from "@jarvis/shared";

export function AuroraVisionPage() {
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const setCameraRequested = useJarvisStore((s) => s.setCameraRequested);
  const privacyMode = useJarvisStore((s) => s.privacyMode);
  const setPrivacyMode = useJarvisStore((s) => s.setPrivacyMode);
  const trackingFps = useJarvisStore((s) => s.trackingFps);
  const detectionLatencyMs = useJarvisStore((s) => s.detectionLatencyMs);
  const experienceMode = useJarvisStore((s) => s.experienceMode);
  const setExperienceMode = useJarvisStore((s) => s.setExperienceMode);
  const addSpatialWindow = useJarvisStore((s) => s.addSpatialWindow);
  const activeProfile = useJarvisStore((s) => s.surfaceProfiles[s.activeProfileId]);
  const updateActiveProfile = useJarvisStore((s) => s.updateActiveProfile);

  const [showCalibration, setShowCalibration] = useState(false);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [showSurfaceSettings, setShowSurfaceSettings] = useState(false);
  const [showWindowMenu, setShowWindowMenu] = useState(false);

  const openProjectorWindow = () => {
    window.open(
      "/projector",
      "AuroraProjectorWindow",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  const windowOptions: Array<{ type: SpatialWindowType; label: string }> = [
    { type: "vendas", label: "Vendas & Desempenho" },
    { type: "crm", label: "CRM & Leads (Axis)" },
    { type: "financeiro", label: "Painel Financeiro" },
    { type: "projetos", label: "Projetos & Tarefas" },
    { type: "automacoes", label: "Workflows n8n" },
    { type: "waha", label: "WhatsApp (WAHA)" },
  ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black select-none">
      {/* Top Vision Command Bar */}
      <header className="z-30 flex items-center justify-between border-b border-jarvis-border/70 bg-jarvis-panel/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-jarvis-cyanBright shadow-[0_0_8px_#4fd7ff] animate-pulse" />
            <span className="font-extrabold tracking-wider text-sm text-white">AURORA VISION</span>
          </div>
          <span className="hidden text-xs text-white/40 sm:inline">|</span>
          <div className="hidden items-center gap-1.5 rounded-full border border-jarvis-border/80 bg-black/40 px-3 py-1 font-mono text-[11px] text-jarvis-cyanBright sm:flex">
            <span>PERFIL: {activeProfile?.name || "Modo Parede"}</span>
          </div>
        </div>

        {/* Quick Actions & Modals */}
        <div className="flex items-center gap-2">
          {/* Add Spatial Window Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWindowMenu(!showWindowMenu)}
              className="flex items-center gap-1.5 rounded-lg border border-jarvis-cyan/40 bg-jarvis-cyan/10 px-3 py-1.5 text-xs font-semibold text-jarvis-cyanBright hover:bg-jarvis-cyan/20"
            >
              <Plus size={13} /> Painel Holográfico
            </button>
            {showWindowMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-jarvis-border/90 bg-jarvis-panel/95 p-1.5 shadow-2xl backdrop-blur-xl">
                {windowOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      addSpatialWindow(opt.type, opt.label);
                      setShowWindowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-white/80 hover:bg-jarvis-cyan/15 hover:text-white"
                  >
                    <span>+</span> {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Presentation Mode Button */}
          <button
            type="button"
            onClick={() => setExperienceMode(experienceMode === "presentation" ? "normal" : "presentation")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              experienceMode === "presentation"
                ? "border-jarvis-cyanBright bg-jarvis-cyanBright/25 text-white"
                : "border-jarvis-border text-white/70 hover:border-jarvis-cyan/40 hover:text-white"
            }`}
          >
            <Presentation size={13} /> Apresentação
          </button>

          {/* Demo Mode Button */}
          <button
            type="button"
            onClick={() => setExperienceMode(experienceMode === "demo" ? "normal" : "demo")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              experienceMode === "demo"
                ? "border-yellow-400/80 bg-yellow-400/20 text-yellow-300"
                : "border-jarvis-border text-white/70 hover:border-yellow-400/40 hover:text-white"
            }`}
          >
            <Sparkles size={13} /> Demo
          </button>

          {/* Surface Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowSurfaceSettings(!showSurfaceSettings)}
            className="rounded-lg border border-jarvis-border p-1.5 text-white/70 hover:border-jarvis-cyan/40 hover:text-white"
            title="Configurações de Projeção & Superfície"
          >
            <Sliders size={15} />
          </button>

          {/* Calibration Wizard Button */}
          <button
            type="button"
            onClick={() => setShowCalibration(true)}
            className="flex items-center gap-1.5 rounded-lg border border-jarvis-border bg-black/40 px-3 py-1.5 text-xs text-white/80 hover:border-jarvis-cyan/50 hover:text-white"
          >
            Calibrar 4 Pontos
          </button>

          {/* Device Manager Modal Toggle */}
          <button
            type="button"
            onClick={() => setShowDeviceManager(true)}
            className="rounded-lg border border-jarvis-border p-1.5 text-white/70 hover:border-jarvis-cyan/40 hover:text-white"
            title="Gerenciador de Dispositivos"
          >
            <Tv size={15} />
          </button>

          {/* Projector Window Launcher */}
          <button
            type="button"
            onClick={openProjectorWindow}
            className="flex items-center gap-1 rounded-lg bg-jarvis-cyan px-3 py-1.5 text-xs font-bold text-jarvis-bg hover:bg-jarvis-cyanBright shadow-[0_0_12px_rgba(79,215,255,0.3)]"
          >
            <ExternalLink size={12} /> Projetor
          </button>
        </div>
      </header>

      {/* Main Holographic Canvas */}
      <div className="relative flex-1 overflow-hidden">
        {/* Central 3D Aurora Energy Sphere */}
        <div className="absolute inset-0 z-0">
          <EnergySphere />
        </div>

        {/* Spatial Windows Floating in 3D Stage */}
        <SpatialWindowManager />

        {/* Multimodal Target Highlight Reticle */}
        <MultimodalHighlight />

        {/* Holographic Cursor */}
        <HolographicCursor />

        {/* Voice Transcript Overlay */}
        <TranscriptOverlay />

        {/* Live Camera & Telemetry PiP Box (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-jarvis-border/80 bg-black/80 px-3 py-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setCameraRequested(!cameraActive)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                cameraActive
                  ? "bg-jarvis-green/20 text-jarvis-green border border-jarvis-green/40"
                  : "bg-white/10 text-white/60"
              }`}
            >
              <Camera size={11} /> {cameraActive ? "CÂMERA ATIVA" : "CÂMERA DESATIVADA"}
            </button>

            {cameraActive && (
              <div className="flex items-center gap-2 font-mono text-[10px] text-white/40 border-l border-white/10 pl-2">
                <span>{trackingFps.toFixed(0)} FPS</span>
                <span>{detectionLatencyMs.toFixed(1)}ms</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`p-1 rounded-md transition-colors ${
                privacyMode ? "text-jarvis-amber bg-jarvis-amber/20" : "text-white/40 hover:text-white"
              }`}
              title="Modo Privacidade"
            >
              <Shield size={13} />
            </button>
          </div>
        </div>

        {/* Surface Settings Drawer / Modal */}
        {showSurfaceSettings && (
          <div className="absolute left-4 top-4 z-50 w-80 max-w-sm">
            <SurfaceSettingsPanel onOpenCalibration={() => setShowCalibration(true)} />
          </div>
        )}
      </div>

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

