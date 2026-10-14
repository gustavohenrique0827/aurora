import { Camera, CameraOff, ShieldAlert } from "lucide-react";
import { useJarvisStore } from "../../state/store";

/**
 * "ATIVAR VISÃO" (Seção 2) — camera is NEVER started without this explicit click, and the
 * "● CAMERA ATIVA" indicator only shows once the stream is actually flowing (not just
 * requested). This button only sets INTENT (`cameraRequested`) — the actual engine lives
 * once in useGlobalVisionAgent (AppShell) and reacts to that flag, so any component
 * (this one, Configurações) can control it without needing the engine instance itself.
 * Privacy Mode is a single always-visible switch that force-stops the camera regardless
 * of what page is open.
 */
export function CameraPermissionGate() {
  const cameraRequested = useJarvisStore((s) => s.cameraRequested);
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const cameraStarting = useJarvisStore((s) => s.cameraStarting);
  const cameraError = useJarvisStore((s) => s.cameraError);
  const privacyMode = useJarvisStore((s) => s.privacyMode);
  const setPrivacyMode = useJarvisStore((s) => s.setPrivacyMode);
  const setCameraRequested = useJarvisStore((s) => s.setCameraRequested);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setCameraRequested(!cameraRequested)}
        disabled={privacyMode || cameraStarting}
        title={cameraError ?? (cameraActive ? "Desativar visão" : "Ativar visão (câmera)")}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-40 ${
          cameraActive
            ? "border-jarvis-green/40 bg-jarvis-green/10 text-jarvis-green"
            : "border-jarvis-border bg-jarvis-surface text-white/50 hover:border-jarvis-accent/40 hover:text-white/80"
        }`}
      >
        {cameraActive ? <Camera size={13} /> : <CameraOff size={13} />}
        <span className="hidden sm:inline">
          {cameraStarting ? "Ativando..." : cameraActive ? "● Câmera ativa" : "Ativar visão"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setPrivacyMode(!privacyMode)}
        title={privacyMode ? "Privacy Mode ligado — câmera, gestos e microfone bloqueados" : "Ativar Privacy Mode"}
        className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
          privacyMode
            ? "border-jarvis-amber/50 bg-jarvis-amber/10 text-jarvis-amber"
            : "border-jarvis-border text-white/30 hover:text-white/60"
        }`}
      >
        <ShieldAlert size={13} />
      </button>
    </div>
  );
}
