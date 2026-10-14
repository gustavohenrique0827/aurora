import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let landmarkerPromise: Promise<HandLandmarker> | null = null;

/**
 * Lazily creates a single shared HandLandmarker instance (the model + WASM runtime are
 * a real download, ~a few MB, cached by the browser after the first load — never fetched
 * again just because a component remounted). Runs entirely in the browser (WASM/WebGL);
 * no frame or landmark data is ever sent anywhere over the network by this module.
 */
export function getHandLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then(async (vision) => {
      try {
        return await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      } catch (gpuErr) {
        // The GPU delegate (WebGL-backed) is a known failure point on a real slice of
        // GPU/driver/browser combinations — it throws instead of degrading gracefully.
        // CPU delegate is slower but works everywhere; falling back here is the
        // difference between "camera never turns on" and "tracking just runs a bit hotter".
        console.warn(
          "[handLandmarker] GPU delegate falhou, tentando CPU delegate como fallback:",
          gpuErr
        );
        return HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      }
    });
    // If both delegates fail, don't leave a broken promise cached forever — the next
    // getHandLandmarker() call (e.g. user clicks "Ativar Visão" again) should retry from
    // scratch instead of permanently replaying the same rejection.
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}
