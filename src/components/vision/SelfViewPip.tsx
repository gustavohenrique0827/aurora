import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useJarvisStore } from "../../state/store";
import { useLiveVideoElement } from "../../hooks/useLiveVideoElement";
import { CameraFeedPreview } from "./CameraFeedPreview";

/**
 * A small self-view of the real camera feed while gesture/vision mode is on — mirrored
 * (selfie convention), unlike CalibrationWizard's preview which deliberately isn't. Gustavo
 * asked for this: pointing/pinching at Aurora with nothing to look at but an abstract cursor
 * dot made it hard to tell whether a touch gesture actually matched what his hand was doing.
 * Only rendered while the camera is actually active — the header's CameraPermissionGate is
 * already the control for turning it on in the first place.
 */
export function SelfViewPip() {
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const videoElement = useLiveVideoElement();
  const [hidden, setHidden] = useState(false);

  if (!cameraActive) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-40">
      {hidden ? (
        <button
          type="button"
          onClick={() => setHidden(false)}
          title="Mostrar sua câmera"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-jarvis-border/80 bg-black/70 text-white/60 backdrop-blur-md hover:text-white"
        >
          <Eye size={15} />
        </button>
      ) : (
        <div className="relative aspect-[4/3] w-36 overflow-hidden rounded-xl border border-jarvis-accent/40 bg-black/80 shadow-[0_4px_20px_rgba(0,0,0,0.6)] sm:w-44">
          <CameraFeedPreview source={videoElement} mirrored fallback={null} />
          <button
            type="button"
            onClick={() => setHidden(true)}
            title="Esconder sua câmera"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:text-white"
          >
            <EyeOff size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
