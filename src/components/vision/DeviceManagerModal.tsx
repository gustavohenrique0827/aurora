import { useEffect, useState } from "react";
import {
  Camera,
  Tv,
  Mic,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { GlassPanel } from "../common/GlassPanel";
import { useJarvisStore } from "../../state/store";
import type { DeviceStatus } from "@jarvis/shared";

interface DeviceManagerModalProps {
  onClose?: () => void;
  onOpenCalibration?: () => void;
}

export function DeviceManagerModal({ onClose, onOpenCalibration }: DeviceManagerModalProps) {
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const cameraError = useJarvisStore((s) => s.cameraError);
  const deviceState = useJarvisStore((s) => s.deviceState);
  const setDeviceState = useJarvisStore((s) => s.setDeviceState);
  const activeProfile = useJarvisStore((s) => s.surfaceProfiles[s.activeProfileId]);

  const [scanning, setScanning] = useState(false);

  const scanDevices = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    setScanning(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Câmera ${d.deviceId.slice(0, 5)}` }));
      const audioDevices = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microfone ${d.deviceId.slice(0, 5)}` }));

      setDeviceState({
        cameras: videoDevices,
        selectedCameraId: videoDevices[0]?.deviceId || null,
        microphones: audioDevices,
        selectedMicId: audioDevices[0]?.deviceId || null,
      });
    } catch (err) {
      console.warn("[DeviceManager] error enumerating devices:", err);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    scanDevices();
  }, []);

  const getStatusBadge = (status: DeviceStatus, label?: string) => {
    switch (status) {
      case "connected":
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-jarvis-green/40 bg-jarvis-green/10 px-2.5 py-0.5 text-[10px] font-semibold text-jarvis-green">
            <CheckCircle2 size={11} /> {label || "CONECTADO"}
          </span>
        );
      case "calibrating":
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-jarvis-accent/40 bg-jarvis-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-jarvis-accentBright">
            <RefreshCw size={11} className="animate-spin" /> {label || "CALIBRANDO"}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-jarvis-red/40 bg-jarvis-red/10 px-2.5 py-0.5 text-[10px] font-semibold text-jarvis-red">
            <XCircle size={11} /> {label || "ERRO"}
          </span>
        );
      case "disconnected":
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-jarvis-amber/40 bg-jarvis-amber/10 px-2.5 py-0.5 text-[10px] font-semibold text-jarvis-amber">
            <AlertTriangle size={11} /> {label || "DESCONECTADO"}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-jarvis-accent/30 bg-jarvis-panel/95 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-jarvis-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-jarvis-accent/15 text-jarvis-accentBright">
              <Tv size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-white">Gerenciador de Dispositivos (Device Manager)</h2>
              <p className="text-xs text-white/50">Câmeras, Projetores, Microfones e Saídas de Áudio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scanDevices}
              disabled={scanning}
              className="flex items-center gap-1 rounded-lg border border-jarvis-border px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              <RefreshCw size={12} className={scanning ? "animate-spin" : ""} /> Atualizar
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg border border-jarvis-border px-3 py-1.5 text-xs text-white/60 hover:bg-white/5 hover:text-white"
              >
                Fechar
              </button>
            )}
          </div>
        </div>

        {/* Devices List */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* 1. Camera Status */}
          <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jarvis-accent/10 text-jarvis-accentBright">
                  <Camera size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Câmera de Visão Computacional</div>
                  <div className="text-xs text-white/50">
                    {deviceState.cameras.length > 0
                      ? `${deviceState.cameras.length} câmera(s) detectada(s)`
                      : "Verificando dispositivos de vídeo..."}
                  </div>
                </div>
              </div>
              <div>
                {getStatusBadge(
                  cameraError ? "error" : cameraActive ? "connected" : "disconnected",
                  cameraError ? "ERRO" : cameraActive ? "CONECTADO" : "DESCONECTADO"
                )}
              </div>
            </div>
            {deviceState.cameras.length > 0 && (
              <div className="mt-3">
                <select
                  value={deviceState.selectedCameraId || ""}
                  onChange={(e) => setDeviceState({ selectedCameraId: e.target.value })}
                  className="w-full rounded-lg border border-jarvis-border/80 bg-jarvis-bg px-3 py-2 text-xs text-white/90 focus:border-jarvis-accent focus:outline-none"
                >
                  {deviceState.cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Projector Status */}
          <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jarvis-accent/10 text-jarvis-accentBright">
                  <Tv size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Projetor / Tela Secundária</div>
                  <div className="text-xs text-white/50">
                    Perfil Ativo: {activeProfile?.name || "Modo Parede"} (Calibração 4-Pontos)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(
                  activeProfile?.updatedAt ? "connected" : "calibrating",
                  activeProfile?.updatedAt ? "CALIBRADO" : "CALIBRAÇÃO NECESSÁRIA"
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  window.open(
                    "/projector",
                    "AuroraProjectorWindow",
                    "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
                  )
                }
                className="flex items-center gap-1.5 rounded-lg bg-jarvis-accent/15 border border-jarvis-accent/30 px-3 py-1.5 text-xs text-jarvis-accentBright hover:bg-jarvis-accent/25"
              >
                <ExternalLink size={12} /> Abrir Janela do Projetor
              </button>
              {onOpenCalibration && (
                <button
                  type="button"
                  onClick={onOpenCalibration}
                  className="rounded-lg border border-jarvis-border px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Recalibrar 4 Pontos
                </button>
              )}
            </div>
          </div>

          {/* 3. Microphone Status */}
          <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jarvis-accent/10 text-jarvis-accentBright">
                  <Mic size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Microfone / Entrada de Voz</div>
                  <div className="text-xs text-white/50">
                    {deviceState.microphones.length > 0
                      ? `${deviceState.microphones.length} dispositivo(s) de áudio`
                      : "Microfone padrão"}
                  </div>
                </div>
              </div>
              <div>{getStatusBadge("connected", "CONECTADO")}</div>
            </div>
          </div>

          {/* 4. Audio Output */}
          <div className="rounded-xl border border-jarvis-border/60 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-jarvis-accent/10 text-jarvis-accentBright">
                  <Volume2 size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Alto-Falante / Síntese de Voz (TTS)</div>
                  <div className="text-xs text-white/50">Áudio estéreo de alta fidelidade</div>
                </div>
              </div>
              <div>{getStatusBadge("connected", "CONECTADO")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

