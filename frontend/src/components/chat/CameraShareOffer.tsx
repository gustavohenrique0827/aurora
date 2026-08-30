import { useState } from "react";
import { Camera } from "lucide-react";
import { captureCameraFrame } from "../../lib/cameraCapture";

interface CameraShareOfferProps {
  onConfirm: (image: { base64: string; mimeType: string }) => void;
  onCancel: () => void;
}

/**
 * Inline offer shown when "tira uma foto"/"usa a câmera" is recognized (voice or typed).
 * The click on "Usar câmera" IS the browser gesture getUserMedia requires — the
 * voice/text command only gets us to this offer, never straight to the camera.
 */
export function CameraShareOffer({ onConfirm, onCancel }: CameraShareOfferProps) {
  const [status, setStatus] = useState<"idle" | "capturing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCapture = async () => {
    setStatus("capturing");
    setErrorMessage(null);
    try {
      const frame = await captureCameraFrame();
      onConfirm({ base64: frame.base64, mimeType: frame.mimeType });
    } catch (err) {
      // Most common case: the user declined the camera permission prompt — that's a
      // normal decline, not a bug, so keep the message calm either way.
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível usar a câmera.");
    }
  };

  return (
    <div className="mx-4 mb-2 flex flex-col gap-2 rounded-xl border border-jarvis-cyan/30 bg-jarvis-cyan/10 px-4 py-3 text-sm text-white/85">
      <div className="flex items-center gap-2">
        <Camera size={16} className="shrink-0 text-jarvis-cyanBright" />
        <span>Aurora pede permissão pra usar sua câmera — tira uma foto do que quer mostrar.</span>
      </div>
      {status === "error" && <div className="text-xs text-jarvis-amber">{errorMessage}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCapture}
          disabled={status === "capturing"}
          className="rounded-full border border-jarvis-cyan/40 bg-jarvis-cyan/15 px-3.5 py-1.5 text-xs font-medium text-jarvis-cyanBright transition-opacity disabled:opacity-50"
        >
          {status === "capturing" ? "Abrindo câmera..." : "Usar câmera"}
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
