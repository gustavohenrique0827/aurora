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

  // Refine 4 corner points with margin
  const normMinX = Math.max(0.05, minX / sampleWidth);
  const normMaxX = Math.min(0.95, maxX / sampleWidth);
  const normMinY = Math.max(0.05, minY / sampleHeight);
  const normMaxY = Math.min(0.95, maxY / sampleHeight);

  // Return detected quad in normalized [0,1] space
  return {
    topLeft: { x: normMinX, y: normMinY },
    topRight: { x: normMaxX, y: normMinY },
    bottomRight: { x: normMaxX, y: normMaxY },
    bottomLeft: { x: normMinX, y: normMaxY },
  };
}

