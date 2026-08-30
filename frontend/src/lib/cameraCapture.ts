export interface CapturedFrame {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.7;

/**
 * Opens the device camera, grabs exactly ONE frame, and stops the stream immediately —
 * never records continuously. Independent of the hand-tracking camera in
 * useHandTrackingEngine.ts (that stream is fully encapsulated in the hook, not exposed
 * for reuse), so this requests its own getUserMedia stream. Must be called from inside a
 * real click handler: getUserMedia requires transient user activation, which a
 * voice-recognized phrase alone doesn't carry (see cameraVisionIntent.ts for why the
 * offer-then-click flow exists instead of capturing straight off the voice command).
 */
export async function captureCameraFrame(): Promise<CapturedFrame> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    // Wait one paint so videoWidth/videoHeight are populated.
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível capturar o frame (contexto de canvas indisponível)");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { dataUrl, base64: dataUrl.split(",")[1] ?? "", mimeType: "image/jpeg" };
  } finally {
    // Single frame only — the camera light stays on for exactly as long as it takes to
    // grab one photo, then turns off.
    stream.getTracks().forEach((track) => track.stop());
  }
}
