import { useCallback, useEffect, useRef } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { getHandLandmarker } from "../lib/handTracking/handLandmarker";
import { computeFingerStates } from "../lib/handTracking/fingerState";
import { classifyPose, computePointingDirection } from "../lib/handTracking/poseClassifier";
import { PinchTracker, pinchDistanceRatio, pinchMidpoint, pinchThresholds } from "../lib/handTracking/pinchEngine";
import { CircularMotionTracker } from "../lib/handTracking/circularMotion";
import { SwipeTracker } from "../lib/handTracking/swipeEngine";
import { AirGestureTracker } from "../lib/handTracking/airGestures";
import { matchCustomGesture } from "../lib/handTracking/customGestures";
import type { HandFrame, HandSide, PoseName, Point3 } from "../lib/handTracking/types";
import { useJarvisStore } from "../state/store";

const WRIST = 0;
const STATS_PUBLISH_INTERVAL = 15; // ticks between trackingFps/detectionLatencyMs store writes
const FPS_BUFFER_SIZE = 30;

interface HandRuntime {
  pinchTracker: PinchTracker;
  circularTracker: CircularMotionTracker;
  swipeTracker: SwipeTracker;
  airGestureTracker: AirGestureTracker;
  prevWrist: { x: number; y: number; t: number } | null;
  /** Last pose actually logged to gesture history — lets history log only real
   * transitions (Seção 46), not 30/sec of "POINTING POINTING POINTING..." repeats. */
  prevLoggedPose: PoseName | null;
}

function makeHandRuntime(): HandRuntime {
  return {
    pinchTracker: new PinchTracker(),
    circularTracker: new CircularMotionTracker(),
    swipeTracker: new SwipeTracker(),
    airGestureTracker: new AirGestureTracker(),
    prevWrist: null,
    prevLoggedPose: null,
  };
}

/**
 * Camera Engine + Hand Tracking Engine (Seção 66) — same shape as useVoiceEngine.ts: owns
 * getUserMedia, a hidden processing element (<video> instead of an AnalyserNode), a
 * requestAnimationFrame loop, and exposes imperative start()/stop() to a "global" hook
 * (useGlobalVisionAgent) mounted once in AppShell. All detection runs in-browser via
 * MediaPipe's WASM/WebGL runtime — no frame, landmark, or gesture data is ever sent to
 * the backend or to n8n (Seção 50).
 */
export function useHandTrackingEngine() {
  const setCameraActive = useJarvisStore((s) => s.setCameraActive);
  const setCameraStarting = useJarvisStore((s) => s.setCameraStarting);
  const setCameraError = useJarvisStore((s) => s.setCameraError);
  const setCameraRequested = useJarvisStore((s) => s.setCameraRequested);
  const setHands = useJarvisStore((s) => s.setHands);
  const setHandLostWarning = useJarvisStore((s) => s.setHandLostWarning);
  const pushGestureHistory = useJarvisStore((s) => s.pushGestureHistory);
  const setTrackingStats = useJarvisStore((s) => s.setTrackingStats);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  // Tracking-loop performance (Seção 59/60) — rAF-to-rAF delta feeds a rolling FPS
  // average; publish is throttled (STATS_PUBLISH_INTERVAL ticks) since this is a
  // human-readable counter, not a control signal driving any behavior.
  const lastTickAtRef = useRef<number | null>(null);
  const fpsBufferRef = useRef<number[]>([]);
  const statsTickRef = useRef(0);
  const runtimeRef = useRef<Record<HandSide, HandRuntime>>({
    left: makeHandRuntime(),
    right: makeHandRuntime(),
  });

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    runtimeRef.current.left.pinchTracker.reset();
    runtimeRef.current.right.pinchTracker.reset();
    runtimeRef.current.left.circularTracker.reset();
    runtimeRef.current.right.circularTracker.reset();
    runtimeRef.current.left.swipeTracker.reset();
    runtimeRef.current.right.swipeTracker.reset();
    runtimeRef.current.left.airGestureTracker.reset();
    runtimeRef.current.right.airGestureTracker.reset();
    runtimeRef.current.left.prevWrist = null;
    runtimeRef.current.right.prevWrist = null;
    runtimeRef.current.left.prevLoggedPose = null;
    runtimeRef.current.right.prevLoggedPose = null;
    lastTickAtRef.current = null;
    fpsBufferRef.current = [];
    statsTickRef.current = 0;
    setTrackingStats(0, 0);
    setHands({});
    setHandLostWarning(false);
    setCameraActive(false);
    setCameraStarting(false);
  }, [setCameraActive, setCameraStarting, setHandLostWarning, setHands, setTrackingStats]);

  const loop = useCallback(() => {
    if (!runningRef.current || !videoRef.current || !landmarkerRef.current) return;
    const video = videoRef.current;

    // Tracking-loop FPS (Seção 59) — measured at the top of every tick, independent of
    // whether the video frame was actually ready below, so it reflects the real rAF
    // cadence this loop is running at, not just the "successful detection" rate.
    const tickAt = performance.now();
    if (lastTickAtRef.current !== null) {
      const tickDt = tickAt - lastTickAtRef.current;
      if (tickDt > 0) {
        const buf = fpsBufferRef.current;
        buf.push(1000 / tickDt);
        if (buf.length > FPS_BUFFER_SIZE) buf.shift();
      }
    }
    lastTickAtRef.current = tickAt;

    if (video.readyState >= 2) {
      const detectStart = performance.now();
      const result = landmarkerRef.current.detectForVideo(video, detectStart);
      const now = performance.now();
      const detectionLatencyMs = now - detectStart;
      const store = useJarvisStore.getState();
      const threshold = store.confidenceThreshold;
      // Corrects the x/y normalization mismatch on non-square video frames (see the note
      // on dist() in fingerState.ts/pinchEngine.ts) and turns the live "Sensibilidade do
      // Pinch" slider into concrete thresholds — computed once per tick, shared by both
      // hands, so a slider change takes effect on the very next frame.
      const aspect = video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 4 / 3;
      const { start: pinchStart, release: pinchRelease } = pinchThresholds(store.pinchSensitivity);

      const frames: Partial<Record<HandSide, HandFrame>> = {};

      result.landmarks.forEach((rawLandmarks, i) => {
        const handedness = result.handedness[i]?.[0];
        if (!handedness) return;
        // See note in handLandmarker.ts / MediaPipe docs: handedness assumes a mirrored
        // (selfie-style) input frame, which matches how this feed is meant to be used —
        // if left/right ever reads swapped for you live, flip this mapping.
        const side: HandSide = handedness.categoryName === "Left" ? "left" : "right";
        const landmarks: Point3[] = rawLandmarks.map((p) => ({ x: p.x, y: p.y, z: p.z }));

        const fingerStates = computeFingerStates(landmarks, aspect);
        const ratio = pinchDistanceRatio(landmarks, aspect);
        const runtime = runtimeRef.current[side];
        const rawPinchActive = runtime.pinchTracker.update(ratio, pinchStart, pinchRelease);
        // OK sign and a real grab-pinch look identical by thumb-index distance alone —
        // the difference is what the other three fingers are doing. A splayed OK sign
        // must never trigger the orb-grab interaction, so it's excluded from pinchActive
        // here rather than left for SphereScene to guess at.
        const looksLikeOkSign =
          fingerStates.middle === "EXTENDED" && fingerStates.ring === "EXTENDED" && fingerStates.pinky === "EXTENDED";
        const pinchActive = rawPinchActive && !looksLikeOkSign;
        const builtInPose = pinchActive
          ? { pose: "PINCH" as const, confidence: 0.9 }
          : rawPinchActive && looksLikeOkSign
            ? { pose: "OK" as const, confidence: 0.85 }
            : classifyPose(landmarks, fingerStates);
        // Custom gestures (Seção 41) only fill gaps the built-in table leaves as UNKNOWN —
        // they never shadow a recognized built-in pose.
        let pose = builtInPose;
        if (builtInPose.pose === "UNKNOWN") {
          const customGestures = useJarvisStore.getState().customGestures;
          const match = customGestures.length > 0 ? matchCustomGesture(landmarks, customGestures) : null;
          if (match) pose = { pose: "CUSTOM", confidence: 0.75, customGestureId: match.id };
        }

        const wrist = { x: landmarks[WRIST].x, y: landmarks[WRIST].y };
        let velocity = 0;
        if (runtime.prevWrist) {
          const dt = (now - runtime.prevWrist.t) / 1000;
          if (dt > 0) {
            velocity = Math.hypot(wrist.x - runtime.prevWrist.x, wrist.y - runtime.prevWrist.y) / dt;
          }
        }
        runtime.prevWrist = { ...wrist, t: now };

        // Circular motion (Seção 17) is tracked continuously off the wrist path — cheap,
        // and lets the tracker accumulate history even across a brief pose change instead
        // of resetting every time the classified pose flickers.
        const circularMotion = runtime.circularTracker.update(wrist.x, wrist.y, now);
        const pointingDirection =
          pose.pose === "POINTING" || pose.pose === "FINGER_GUN" ? computePointingDirection(landmarks) : null;

        const pinchPos = pinchMidpoint(landmarks);
        const swipe = runtime.swipeTracker.update(wrist.x, wrist.y, now);
        const gestureEvent = runtime.airGestureTracker.update({
          pinchActive,
          pinchPos,
          pose: pose.pose,
          swipe,
          t: now,
        });

        // Gesture history (Seção 46) — log real transitions only: a newly-recognized
        // pose (not UNKNOWN, not a repeat of what's already logged) or an air-gesture
        // pulse (already edge-triggered by construction).
        if (pose.pose !== "UNKNOWN" && pose.pose !== runtime.prevLoggedPose) {
          runtime.prevLoggedPose = pose.pose;
          pushGestureHistory({ timestamp: now, side, label: pose.pose });
        } else if (pose.pose === "UNKNOWN") {
          runtime.prevLoggedPose = null;
        }
        if (gestureEvent) {
          pushGestureHistory({ timestamp: now, side, label: gestureEvent.type });
        }

        frames[side] = {
          side,
          landmarks,
          wrist,
          handednessConfidence: handedness.score,
          fingerStates,
          pose,
          pinch: { active: pinchActive, distanceRatio: ratio, position: pinchPos },
          pointingDirection,
          circularMotion,
          gestureEvent,
          velocity,
          timestamp: now,
        };

        void threshold; // gating happens where actions are triggered (e.g. orb grab), not here
      });

      // A hand that stops appearing mid-pinch is a real "lost the hand" case (Seção 47) —
      // surface a warning instead of silently freezing the last known grab state.
      const prevHands = useJarvisStore.getState().hands;
      const lostMidPinch = (["left", "right"] as HandSide[]).some(
        (side) => prevHands[side]?.pinch.active && !frames[side]
      );
      setHandLostWarning(lostMidPinch);
      if (!frames.left) runtimeRef.current.left.prevWrist = null;
      if (!frames.right) runtimeRef.current.right.prevWrist = null;

      setHands(frames);

      // Throttled publish (Seção 59/60) — a few updates/sec is plenty for a readout
      // meant for human eyes (GestureDebugPanel/Configurações); writing every tick would
      // just add re-renders in those subscribers for no perceptible benefit.
      statsTickRef.current += 1;
      if (statsTickRef.current >= STATS_PUBLISH_INTERVAL) {
        statsTickRef.current = 0;
        const buf = fpsBufferRef.current;
        const avgFps = buf.length > 0 ? buf.reduce((a, b) => a + b, 0) / buf.length : 0;
        setTrackingStats(avgFps, detectionLatencyMs);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [setHandLostWarning, setHands, pushGestureHistory, setTrackingStats]);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    setCameraError(null);
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      landmarkerRef.current = await getHandLandmarker();

      runningRef.current = true;
      setCameraActive(true);
      setCameraStarting(false);
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      // The user-facing message below is deliberately generic — but swallowing the real
      // error entirely made every startup failure (blocked WASM/model CDN, unsupported GPU
      // delegate, permission denial, no camera device) look identical from the outside.
      // Logging it is the only way to tell which one actually happened.
      console.error("[useHandTrackingEngine] falha ao iniciar câmera/tracking:", err);
      setCameraStarting(false);
      setCameraActive(false);
      // Reset the intent flag too — otherwise useGlobalVisionAgent's effect sees
      // cameraRequested=true / cameraActive=false forever and the toggle button looks
      // stuck "off" while secretly still "wanting" to be on.
      setCameraRequested(false);
      setCameraError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permissão de câmera negada."
          : "Não foi possível ativar a câmera."
      );
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [loop, setCameraActive, setCameraError, setCameraStarting]);

  // Camera never survives a full page reload by design (Seção 2 — never silently on), but
  // it SHOULD stop if the component tree owning it unmounts (e.g. hot reload in dev).
  useEffect(() => stop, [stop]);

  return { start, stop, getVideoElement: () => videoRef.current };
}
