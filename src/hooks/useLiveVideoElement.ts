import { useEffect, useState } from "react";
import { useJarvisStore } from "../state/store";

/**
 * Resolves the one real hand-tracking camera element, live — re-checked whenever the camera
 * starts or stops, since the element only exists once useHandTrackingEngine's getUserMedia call
 * actually resolves, which can happen well after a consumer (e.g. CalibrationWizard, a self-view
 * PiP) first mounts. Reads visionGetVideoElement from the store rather than caching a function
 * reference, since it's set once by useGlobalVisionAgent in AppShell (see visionSlice.ts).
 */
export function useLiveVideoElement(): HTMLVideoElement | null {
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const visionGetVideoElement = useJarvisStore((s) => s.visionGetVideoElement);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    setVideoElement(cameraActive ? visionGetVideoElement?.() ?? null : null);
  }, [cameraActive, visionGetVideoElement]);

  return videoElement;
}
