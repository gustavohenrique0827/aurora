import { useState } from "react";
import { Monitor } from "lucide-react";
import { captureScreenFrame } from "../../lib/screenCapture";

interface ScreenShareOfferProps {
  onConfirm: (image: { base64: string; mimeType: string }) => void;
  onCancel: () => void;
}

/**
 * Inline offer shown when "olha isso"/"vê minha tela" is recognized (voice or typed).
 * The click on "Compartilhar tela" IS the browser gesture getDisplayMedia requires — the
 * voice/text command only gets us to this offer, never straight to the OS picker.
 */
export function ScreenShareOffer({ onConfirm, onCancel }: ScreenShareOfferProps) {
  const [status, setStatus] = useState<"idle" | "capturing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleShare = async () => {
    setStatus("capturing");
    setErrorMessage(null);
    try {
      const frame = await captureScreenFrame();
      onConfirm({ base64: frame.base64, mimeType: frame.mimeType });
    } catch (err) {
      // Most common case: the user closed the native picker without choosing anything —
      // that's a normal decline, not a bug, so keep the message calm either way.
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível compartilhar a tela.");
    }
  };

  return (
    <div className="mx-4 mb-2 flex flex-col gap-2 rounded-xl border border-jarvis-accent/30 bg-jarvis-accent/10 px-4 py-3 text-sm text-white/85">
      <div className="flex items-center gap-2">
        <Monitor size={16} className="shrink-0 text-jarvis-accentBright" />
        <span>Aurora pede permissão pra ver sua tela — escolha o que compartilhar.</span>
      </div>
      {status === "error" && <div className="text-xs text-jarvis-amber">{errorMessage}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleShare}
          disabled={status === "capturing"}
          className="rounded-full border border-jarvis-accent/40 bg-jarvis-accent/15 px-3.5 py-1.5 text-xs font-medium text-jarvis-accentBright transition-opacity disabled:opacity-50"
        >
          {status === "capturing" ? "Abrindo seletor..." : "Compartilhar tela"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-jarvis-border px-3.5 py-1.5 text-xs text-white/50 hover:text-white/80"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
