import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { Vector2 } from "three";
import { SphereScene } from "./SphereScene";
import { useJarvisStore } from "../../state/store";

const FPS_DROP_THRESHOLD = 30;
const FPS_RECOVER_THRESHOLD = 45;
const FPS_WINDOW = 90;
const FPS_MIN_SAMPLES = 60;

function FpsWatcher({ perfLowPower, onPerfLowPowerChange }: { perfLowPower: boolean; onPerfLowPowerChange: (low: boolean) => void }) {
  const frameTimes = useRef<number[]>([]);

  useFrame((_, delta) => {
    const buf = frameTimes.current;
    buf.push(delta);
    if (buf.length > FPS_WINDOW) buf.shift();
    if (buf.length < FPS_MIN_SAMPLES) return;

    const avgDelta = buf.reduce((a, b) => a + b, 0) / buf.length;
    const fps = 1 / avgDelta;
    if (!perfLowPower && fps < FPS_DROP_THRESHOLD) {
      onPerfLowPowerChange(true);
    } else if (perfLowPower && fps > FPS_RECOVER_THRESHOLD) {
      onPerfLowPowerChange(false);
    }
  });

  return null;
}

function CssPulseFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-40 w-40 rounded-full bg-jarvis-cyan/30 shadow-glow animate-pulseGlow blur-[1px]" />
    </div>
  );
}

/** The visual "heart" of Aurora with balanced holographic bloom and orbital framing. */
export function EnergySphere() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [perfLowPower, setPerfLowPower] = useState(false);
  const lowPower = reducedMotion || perfLowPower;
  const [renderFailed, setRenderFailed] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const setRenderQuality = useJarvisStore((s) => s.setRenderQuality);
  const cinematicMode = useJarvisStore((s) => s.cinematicMode);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) setReducedMotion(true);
  }, []);

  useEffect(() => {
    setRenderQuality(lowPower ? "low" : "high");
  }, [lowPower, setRenderQuality]);

  if (renderFailed) {
    return <CssPulseFallback />;
  }

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 5.6], fov: 42 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
              setRenderFailed(true);
            },
            { once: true }
          );
        }}
      >
        <Suspense fallback={null}>
          <SphereScene lowPower={lowPower} interacting={interacting} />
          <FpsWatcher perfLowPower={perfLowPower} onPerfLowPowerChange={setPerfLowPower} />
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={3.5}
            maxDistance={8.5}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.5}
            zoomSpeed={0.6}
            autoRotate={cinematicMode}
            autoRotateSpeed={0.4}
            onStart={() => setInteracting(true)}
            onEnd={() => setInteracting(false)}
          />
          {!lowPower && (
            <EffectComposer>
              <Bloom
                intensity={0.6}
                luminanceThreshold={0.65}
                luminanceSmoothing={0.35}
                mipmapBlur
                radius={0.45}
              />
              <ChromaticAberration
                offset={new Vector2(0.0004, 0.0004)}
                radialModulation={false}
                modulationOffset={0}
              />
              <Vignette darkness={0.8} offset={0.3} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
