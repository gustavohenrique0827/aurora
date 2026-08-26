import type { ReactNode } from "react";
import { useJarvisStore } from "../../state/store";

interface VoiceSupportGateProps {
  children: ReactNode;
}

/** Feature-detection wrapper: shows an honest message instead of a broken mic button on unsupported browsers. */
export function VoiceSupportGate({ children }: VoiceSupportGateProps) {
  const sttSupported = useJarvisStore((s) => s.sttSupported);

  if (!sttSupported) {
    return (
      <div className="rounded-lg border border-jarvis-border bg-jarvis-panel px-3 py-2 text-xs text-white/60">
        Voz não é suportada neste navegador. Use Chrome ou Edge para falar com a Aurora — o chat por texto funciona
        normalmente aqui.
      </div>
    );
  }

  return <>{children}</>;
}
