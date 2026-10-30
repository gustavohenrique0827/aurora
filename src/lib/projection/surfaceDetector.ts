import type { CalibrationQuad, Point2D } from "@jarvis/shared";

/**
 * Surface Detector: Analyzes a video frame from the camera to detect a high-contrast
 * illuminated rectangular projection region on a surface (e.g. wall/tabletop).
 *
 * Employs edge sampling & brightness gradient analysis to estimate the 4 corners of the
 * projected quad. If the lighting conditions do not provide a strong signature, returns null
 * so the system can seamlessly fall back to interactive manual 4-point calibration.
 */
export function detectProjectedSurface(
  videoElement: HTMLVideoElement,
  sampleWidth = 320,
  sampleHeight = 240
): CalibrationQuad | null {
  if (!videoElement || videoElement.readyState < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(videoElement, 0, 0, sampleWidth, sampleHeight);
  const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imgData.data;

  // Grayscale and threshold analysis
  const gray = new Uint8Array(sampleWidth * sampleHeight);
  let totalLum = 0;
  for (let i = 0; i < sampleWidth * sampleHeight; i++) {
    const idx = i * 4;
    const lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) | 0;
    gray[i] = lum;
    totalLum += lum;
  }

  const avgLum = totalLum / (sampleWidth * sampleHeight);
  const threshold = Math.min(240, Math.max(70, avgLum * 1.35));

  // Find bounding extremities of bright projection pixels
  let minX = sampleWidth;
  let maxX = 0;
  let minY = sampleHeight;
  let maxY = 0;
  let brightCount = 0;

  for (let y = 10; y < sampleHeight - 10; y++) {
    for (let x = 10; x < sampleWidth - 10; x++) {
      const val = gray[y * sampleWidth + x];
      if (val > threshold) {
        brightCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const minArea = (sampleWidth * sampleHeight) * 0.08;
  const maxArea = (sampleWidth * sampleHeight) * 0.95;
  const detectedArea = (maxX - minX) * (maxY - minY);

  if (brightCount < 500 || detectedArea < minArea || detectedArea > maxArea) {
    // Insufficient contrast or too diffuse to reliably auto-detect corners
    return null;
  }

  // The bounding box above is only the right answer when the projection surface is viewed
  // head-on. Viewed at an angle — the exact case keystone/homography correction exists for —
  // the bright region is a skewed quad, and clipping it to its bounding box would cut off or
  // distort a real corner. Each true corner is instead the bright pixel closest to the
  // corresponding corner of the sampled frame: for a convex bright blob, that's its actual
  // nearest vertex (the same "closest point to each image corner" technique document-scanner
  // apps use for perspective correction). This degrades to the old bounding box exactly when
  // the quad already is axis-aligned, and gets the skewed case right too.
  type CornerKey = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";
  const anchors: Record<CornerKey, Point2D> = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: sampleWidth, y: 0 },
    bottomRight: { x: sampleWidth, y: sampleHeight },
    bottomLeft: { x: 0, y: sampleHeight },
  };
  const bestDistSq: Record<CornerKey, number> = {
    topLeft: Infinity,
    topRight: Infinity,
    bottomRight: Infinity,
    bottomLeft: Infinity,
  };
  const corners: Record<CornerKey, Point2D> = {
    topLeft: { x: minX, y: minY },
    topRight: { x: maxX, y: minY },
    bottomRight: { x: maxX, y: maxY },
    bottomLeft: { x: minX, y: maxY },
  };
  const cornerKeys = Object.keys(anchors) as CornerKey[];
  for (let y = minY; y <= maxY; y += 2) {
    for (let x = minX; x <= maxX; x += 2) {
      if (gray[y * sampleWidth + x] <= threshold) continue;
      for (const key of cornerKeys) {
        const anchor = anchors[key];
        const distSq = (x - anchor.x) ** 2 + (y - anchor.y) ** 2;
        if (distSq < bestDistSq[key]) {
          bestDistSq[key] = distSq;
          corners[key] = { x, y };
        }
      }
    }
  }

  // Normalize to [0,1] space with the same safety margin the old bounding-box path used.
  const normalize = (p: Point2D): Point2D => ({
    x: Math.max(0.05, Math.min(0.95, p.x / sampleWidth)),
    y: Math.max(0.05, Math.min(0.95, p.y / sampleHeight)),
  });

  return {
    topLeft: normalize(corners.topLeft),
    topRight: normalize(corners.topRight),
    bottomRight: normalize(corners.bottomRight),
    bottomLeft: normalize(corners.bottomLeft),
  };
}

