import { useJarvisStore } from "../../state/store";

export function WakeWordToggle() {
  const wakeWordSupported = useJarvisStore((s) => s.wakeWordSupported);
  const wakeWordEnabled = useJarvisStore((s) => s.wakeWordEnabled);
  const setWakeWordEnabled = useJarvisStore((s) => s.setWakeWordEnabled);

  if (!wakeWordSupported) {
    return (
      <span className="text-xs text-white/40" title="Requer Chrome ou Edge">
        Wake-word indisponível neste navegador
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        wakeWordEnabled
          ? "border-jarvis-cyanBright bg-jarvis-cyan/15 text-jarvis-cyanBright"
          : "border-jarvis-border text-white/50 hover:text-white/80"
      }`}
      title={
        wakeWordEnabled
          ? 'Escutando por "Aurora" — melhor esforço, pode parar sozinho (veja o README)'
          : 'Ativar escuta por "Aurora" (experimental)'
      }
    >
      <span className={`h-1.5 w-1.5 rounded-full ${wakeWordEnabled ? "bg-jarvis-cyanBright animate-pulseGlow" : "bg-white/30"}`} />
      {wakeWordEnabled ? "Ouvindo por “Aurora”" : "Wake-word desligado"}
    </button>
  );
}
