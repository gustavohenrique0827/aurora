import { useEffect } from "react";
import { useHandTrackingEngine } from "./useHandTrackingEngine";
import { useJarvisStore } from "../state/store";

/**
 * Owns the hand-tracking lifecycle at the app-shell level — same reasoning as
 * useGlobalVoiceAgent: mounted once in AppShell so activating vision on one page and
 * navigating to another doesn't kill the camera mid-session.
 *
 * Every other component (CameraPermissionGate, Configurações) talks to this ONE engine
 * instance indirectly, through `cameraRequested`/`privacyMode` in the store, instead of
 * needing the imperative start/stop functions prop-drilled down to them — this hook is
 * the only place that actually calls them.
 *
 * Privacy Mode (Seção 2) is enforced here too: turning it on stops the camera immediately
 * regardless of which page is active, and also clears the request flag so it doesn't
 * immediately restart. It does not yet reach into voice/mic state (that's
 * useGlobalVoiceAgent's domain) — full "everything off" wiring across both engines is a
 * fast-follow once this vision engine has been used live for a while.
 */
export function useGlobalVisionAgent() {
  const { start, stop } = useHandTrackingEngine();
  const cameraRequested = useJarvisStore((s) => s.cameraRequested);
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const privacyMode = useJarvisStore((s) => s.privacyMode);
  const setCameraRequested = useJarvisStore((s) => s.setCameraRequested);

  useEffect(() => {
    if (privacyMode) {
      if (cameraActive) stop();
      if (cameraRequested) setCameraRequested(false);
      return;
    }
    if (cameraRequested && !cameraActive) {
      void start();
    } else if (!cameraRequested && cameraActive) {
      stop();
    }
  }, [cameraRequested, cameraActive, privacyMode, start, stop, setCameraRequested]);

  return { start, stop };
}
