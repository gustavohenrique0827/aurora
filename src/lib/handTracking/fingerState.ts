import type { FingerExtension, FingerName, FingerStates, Point3 } from "./types";

// MediaPipe Hand Landmarker indices — https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
const WRIST = 0;
const FINGER_JOINTS: Record<FingerName, { mcp: number; pip: number; tip: number }> = {
  thumb: { mcp: 2, pip: 3, tip: 4 }, // thumb has no PIP; IP (3) plays that role here
  index: { mcp: 5, pip: 6, tip: 8 },
  middle: { mcp: 9, pip: 10, tip: 12 },
  ring: { mcp: 13, pip: 14, tip: 16 },
  pinky: { mcp: 17, pip: 18, tip: 20 },
};

// MediaPipe's x/y landmarks are normalized independently by the video's width/height —
// they are NOT the same physical unit unless the frame is square. A getUserMedia stream
// commonly settles on 4:3 or 16:9 regardless of the `ideal` hint passed at capture, so
// computing Math.hypot directly on raw x/y mixes two different scales and distorts every
// distance (and therefore every ratio) depending on the hand's orientation on screen —
// the same physical gesture reads differently rotated 0° vs 90°. `aspect` (video width /
// height) corrects this by rescaling x (and z, which MediaPipe documents as roughly on
// x's scale) into y's unit before measuring, so distances reflect real hand geometry.
function dist(a: Point3, b: Point3, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y, (a.z - b.z) * aspect);
}

/**
 * A finger is EXTENDED when its tip sits meaningfully farther from the wrist than its
 * own PIP joint, and FOLDED when the tip is closer to the wrist than the PIP — a ratio
 * comparison, so it holds regardless of hand size/distance from the camera or how the
 * hand is rotated (unlike comparing raw y-coordinates, which breaks the moment the hand
 * isn't held upright).
 */
function classifyFinger(landmarks: Point3[], finger: FingerName, aspect: number): FingerExtension {
  const { pip, tip } = FINGER_JOINTS[finger];
  const wrist = landmarks[WRIST];
  const distTip = dist(landmarks[tip], wrist, aspect);
  const distPip = dist(landmarks[pip], wrist, aspect);
  if (distPip === 0) return "PARTIALLY_EXTENDED";
  const ratio = distTip / distPip;
  if (ratio > 1.15) return "EXTENDED";
  if (ratio < 0.9) return "FOLDED";
  return "PARTIALLY_EXTENDED";
}

/** @param aspect video.videoWidth / video.videoHeight for the current frame — see the
 * note on `dist()` above for why this matters. */
export function computeFingerStates(landmarks: Point3[], aspect: number): FingerStates {
  return {
    thumb: classifyFinger(landmarks, "thumb", aspect),
    index: classifyFinger(landmarks, "index", aspect),
    middle: classifyFinger(landmarks, "middle", aspect),
    ring: classifyFinger(landmarks, "ring", aspect),
    pinky: classifyFinger(landmarks, "pinky", aspect),
  };
}
