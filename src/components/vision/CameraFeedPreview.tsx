import { useEffect, useRef } from "react";

interface CameraFeedPreviewProps {
  /** The hand-tracking engine's own video element (from the store's visionGetVideoElement) —
   * this renders the SAME MediaStream, not a second getUserMedia call. */
  source: HTMLVideoElement | null;
  /** Selfie convention (flip horizontally) for a casual self-view PiP. Calibration screens
   * must pass `false`: they work in raw camera pixel space (surface auto-detection, the
   * manual 4-point drag), and mirroring the preview there would make a dragged corner land
   * on the wrong side of what the user sees. */
  mirrored: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

export function CameraFeedPreview({ source, mirrored, className, fallback }: CameraFeedPreviewProps) {
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = previewRef.current;
    const stream = source?.srcObject;
    if (el && stream instanceof MediaStream) {
      el.srcObject = stream;
    }
  }, [source]);

  if (!source) return <>{fallback}</>;

  return (
    <video
      ref={previewRef}
      autoPlay
      muted
      playsInline
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      className={className ?? "h-full w-full object-cover"}
    />
  );
}
