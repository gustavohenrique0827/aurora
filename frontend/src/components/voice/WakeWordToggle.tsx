import { Ear, EarOff } from "lucide-react";
import { useJarvisStore } from "../../state/store";

/** compact: icon-only square button, sized to sit in a chat bar next to mic/send. */
export function WakeWordToggle({ compact = false }: { compact?: boolean }) {
  const wakeWordSupported = useJarvisStore((s) => s.wakeWordSupported);
  const wakeWordEnabled = useJarvisStore((s) => s.wakeWordEnabled);
  const setWakeWordEnabled = useJarvisStore((s) => s.setWakeWordEnabled);

  if (compact) {
    return (
      <button
        type="button"
        disabled={!wakeWordSupported}
        onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
        aria-pressed={wakeWordEnabled}
        aria-label={wakeWordEnabled ? "Ouvindo por Aurora — clique para desligar" : "Ativar escuta por Aurora"}
        title={
          !wakeWordSupported
            ? "Escuta por “Aurora” requer Chrome ou Edge"
            : wakeWordEnabled
              ? "Ouvindo por “Aurora” — clique para desligar"
              : "Escuta por “Aurora” desligada — clique para ativar"
        }
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all disabled:opacity-30 ${
          wakeWordEnabled && wakeWordSupported
            ? "border-jarvis-cyanBright/70 bg-jarvis-cyan/15 text-jarvis-cyanBright"
            : "border-white/15 bg-white/5 text-white/45 hover:text-white/80"
        }`}
      >
        {wakeWordEnabled && wakeWordSupported ? <Ear size={17} /> : <EarOff size={17} />}
        {wakeWordEnabled && wakeWordSupported && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-jarvis-cyanBright animate-pulseGlow" />
        )}
      </button>
    );
  }

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
