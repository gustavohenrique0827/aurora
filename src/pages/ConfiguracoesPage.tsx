import { useEffect, useRef, useState } from "react";
import { LogOut, ExternalLink, Trash2 } from "lucide-react";
import { GlassPanel } from "../components/common/GlassPanel";
import { api } from "../lib/api";
import { useJarvisStore } from "../state/store";
import type { HandSide } from "../lib/handTracking/types";
import { captureGestureSnapshot } from "../lib/handTracking/customGestures";
import { CUSTOM_GESTURE_ACTIONS, customGestureActionLabel } from "../lib/handTracking/customGestureActions";

const CALIBRATION_STEP_MS = 2000;
const INDEX_TIP = 8;

/**
 * 2-step calibration (Seção 43): point at the screen's top-left, hold 2s, then bottom-
 * right, hold 2s. The two observed raw-landmark corners bound the "comfortable reach"
 * rectangle usePointerMode.ts maps to the full viewport — without this, pointer mode
 * defaults to a generic central sub-rectangle that may not fit a given arm length/camera
 * distance. Robust to which corner is min/max in raw-x either way (see calibration.ts's
 * mirrored mapping) since the final range always takes Math.min/Math.max of the two.
 */
function CalibrationFlow() {
  const calibrationStep = useJarvisStore((s) => s.calibrationStep);
  const setCalibrationStep = useJarvisStore((s) => s.setCalibrationStep);
  const setPointerCalibration = useJarvisStore((s) => s.setPointerCalibration);
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const dominantHand = useJarvisStore((s) => s.dominantHand);

  const [justDone, setJustDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const stepStartRef = useRef(0);
  const rangeRef = useRef({ minX: 1, maxX: 0, minY: 1, maxY: 0 });
  const firstCornerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (calibrationStep === "idle") return;
    stepStartRef.current = performance.now();
    rangeRef.current = { minX: 1, maxX: 0, minY: 1, maxY: 0 };

    const tick = () => {
      const hand = useJarvisStore.getState().hands[dominantHand];
      if (hand) {
        const tip = hand.landmarks[INDEX_TIP];
        rangeRef.current.minX = Math.min(rangeRef.current.minX, tip.x);
        rangeRef.current.maxX = Math.max(rangeRef.current.maxX, tip.x);
        rangeRef.current.minY = Math.min(rangeRef.current.minY, tip.y);
        rangeRef.current.maxY = Math.max(rangeRef.current.maxY, tip.y);
      }

      if (performance.now() - stepStartRef.current >= CALIBRATION_STEP_MS) {
        if (calibrationStep === "top-left") {
          firstCornerRef.current = { x: rangeRef.current.maxX, y: rangeRef.current.minY };
          setCalibrationStep("bottom-right");
        } else {
          const first = firstCornerRef.current;
          const second = { x: rangeRef.current.minX, y: rangeRef.current.maxY };
          if (first) {
            setPointerCalibration({
              minX: Math.min(first.x, second.x),
              maxX: Math.max(first.x, second.x),
              minY: Math.min(first.y, second.y),
              maxY: Math.max(first.y, second.y),
            });
          }
          setCalibrationStep("idle");
          setJustDone(true);
          setTimeout(() => setJustDone(false), 2500);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [calibrationStep, dominantHand, setCalibrationStep, setPointerCalibration]);

  const statusText =
    calibrationStep === "top-left"
      ? "Aponte para o canto superior esquerdo da tela e segure a mão parada..."
      : calibrationStep === "bottom-right"
        ? "Agora o canto inferior direito — segure a mão parada..."
        : justDone
          ? "Calibração salva."
          : "Ajusta o alcance confortável da sua mão ao tamanho da tela";

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-white/80">Calibração do ponteiro</div>
        <div className="text-white/35">{statusText}</div>
      </div>
      <button
        type="button"
        disabled={!cameraActive || calibrationStep !== "idle"}
        onClick={() => setCalibrationStep("top-left")}
        className="rounded-full border border-jarvis-border px-3.5 py-1.5 text-xs text-white/60 transition-colors hover:border-jarvis-cyan/40 hover:text-white/80 disabled:opacity-40"
      >
        {calibrationStep === "idle" ? "Calibrar" : "Calibrando..."}
      </button>
    </div>
  );
}

type RecorderPhase = "idle" | "counting" | "naming";
const COUNTDOWN_START = 3;

/**
 * Records a custom gesture (Seção 41/42): a 3-2-1 countdown, then a snapshot of the
 * dominant hand's current landmarks is captured and named. Matched against live frames by
 * useHandTrackingEngine whenever the built-in pose table returns UNKNOWN. Persisted to
 * localStorage — there's exactly one local "profile" since this app has exactly one user
 * (see the project's own session model), so no profile switcher is built here.
 *
 * The action is a real, working shortcut (Seção 55) picked from a fixed catalog of app
 * actions that already do something (see customGestureActions.ts) — not free text — so
 * useCustomGestureActions.ts can actually execute it the moment the gesture is recognized.
 */
function CustomGestureRecorder() {
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const dominantHand = useJarvisStore((s) => s.dominantHand);
  const customGestures = useJarvisStore((s) => s.customGestures);
  const addCustomGesture = useJarvisStore((s) => s.addCustomGesture);
  const removeCustomGesture = useJarvisStore((s) => s.removeCustomGesture);

  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [pendingSnapshot, setPendingSnapshot] = useState<ReturnType<typeof captureGestureSnapshot> | null>(null);
  const [name, setName] = useState("");
  const [action, setAction] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "counting") return;
    if (countdown <= 0) {
      const hand = useJarvisStore.getState().hands[dominantHand];
      if (!hand) {
        setError("Não detectei sua mão no momento da captura — tente de novo.");
        setPhase("idle");
        return;
      }
      setPendingSnapshot(captureGestureSnapshot(hand.landmarks));
      setPhase("naming");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, dominantHand]);

  const startRecording = () => {
    setError(null);
    setName("");
    setAction("none");
    setCountdown(COUNTDOWN_START);
    setPhase("counting");
  };

  const cancel = () => {
    setPhase("idle");
    setPendingSnapshot(null);
  };

  const save = () => {
    if (!pendingSnapshot || !name.trim()) return;
    addCustomGesture({
      id: crypto.randomUUID(),
      name: name.trim(),
      action,
      snapshot: pendingSnapshot,
      createdAt: Date.now(),
    });
    setPhase("idle");
    setPendingSnapshot(null);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-white/80">Gestos customizados</span>
        <button
          type="button"
          disabled={!cameraActive || phase !== "idle"}
          onClick={startRecording}
          className="rounded-full border border-jarvis-border px-3.5 py-1.5 text-xs text-white/60 transition-colors hover:border-jarvis-cyan/40 hover:text-white/80 disabled:opacity-40"
        >
          Gravar novo gesto
        </button>
      </div>

      {phase === "counting" && (
        <div className="mb-2 text-jarvis-cyanBright">Segure a pose... capturando em {countdown}s</div>
      )}
      {error && <div className="mb-2 text-jarvis-amber">{error}</div>}

      {phase === "naming" && (
        <div className="mb-2 space-y-2 rounded-lg border border-jarvis-border/60 bg-black/20 p-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do gesto (ex: sinal de positivo customizado)"
            className="w-full rounded border border-jarvis-border bg-transparent px-2 py-1 text-white/80 placeholder:text-white/25 focus:border-jarvis-cyan/50 focus:outline-none"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded border border-jarvis-border bg-jarvis-bg px-2 py-1 text-white/80 focus:border-jarvis-cyan/50 focus:outline-none"
          >
            {CUSTOM_GESTURE_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className="px-2.5 py-1 text-white/50 hover:text-white/80">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={save}
              className="rounded-full border border-jarvis-cyan/40 bg-jarvis-cyan/10 px-3 py-1 text-jarvis-cyanBright disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {customGestures.length > 0 ? (
        <ul className="space-y-1.5">
          {customGestures.map((g) => (
            <li key={g.id} className="flex items-center justify-between rounded-lg border border-jarvis-border/60 px-2.5 py-1.5">
              <div>
                <div className="text-white/80">{g.name}</div>
                <div className="text-white/35">{customGestureActionLabel(g.action)}</div>
              </div>
              <button type="button" onClick={() => removeCustomGesture(g.id)} className="text-white/30 hover:text-jarvis-red">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-white/25">Nenhum gesto customizado ainda.</div>
      )}
    </div>
  );
}

/**
 * Deliberately minimal: there's no backend endpoint yet to read/write config safely (and
 * per project rule, secrets never reach the frontend anyway — see .claude/context/stack.md),
 * so this is informational links + the one real action (logout), not a settings form that
 * would fake having more control than the system actually exposes today.
 */
export function ConfiguracoesPage() {
  const setAuthenticated = useJarvisStore((s) => s.setAuthenticated);
  const cameraRequested = useJarvisStore((s) => s.cameraRequested);
  const cameraActive = useJarvisStore((s) => s.cameraActive);
  const cameraError = useJarvisStore((s) => s.cameraError);
  const setCameraRequested = useJarvisStore((s) => s.setCameraRequested);
  const privacyMode = useJarvisStore((s) => s.privacyMode);
  const setPrivacyMode = useJarvisStore((s) => s.setPrivacyMode);
  const debugMode = useJarvisStore((s) => s.debugMode);
  const setDebugMode = useJarvisStore((s) => s.setDebugMode);
  const confidenceThreshold = useJarvisStore((s) => s.confidenceThreshold);
  const setConfidenceThreshold = useJarvisStore((s) => s.setConfidenceThreshold);
  const pinchSensitivity = useJarvisStore((s) => s.pinchSensitivity);
  const setPinchSensitivity = useJarvisStore((s) => s.setPinchSensitivity);
  const dominantHand = useJarvisStore((s) => s.dominantHand);
  const setDominantHand = useJarvisStore((s) => s.setDominantHand);
  const pointerModeEnabled = useJarvisStore((s) => s.pointerModeEnabled);
  const setPointerModeEnabled = useJarvisStore((s) => s.setPointerModeEnabled);
  const cinematicMode = useJarvisStore((s) => s.cinematicMode);
  const setCinematicMode = useJarvisStore((s) => s.setCinematicMode);
  const builtInGestureShortcutsEnabled = useJarvisStore((s) => s.builtInGestureShortcutsEnabled);
  const setBuiltInGestureShortcutsEnabled = useJarvisStore((s) => s.setBuiltInGestureShortcutsEnabled);
  const trackingFps = useJarvisStore((s) => s.trackingFps);
  const detectionLatencyMs = useJarvisStore((s) => s.detectionLatencyMs);
  const renderQuality = useJarvisStore((s) => s.renderQuality);

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setAuthenticated(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 overflow-y-auto p-5 font-sans">
      {/* Header */}
      <div className="border-b border-jarvis-cyan/15 pb-4">
        <h1 className="font-display text-lg font-bold tracking-wide text-white">Configurações do Sistema</h1>
        <p className="font-mono text-xs text-white/40">
          Preferências de Visão Computacional, Gestos, Sessão e Instâncias Conectadas
        </p>
      </div>

      <GlassPanel title="Sessão Ativa">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Gustavo Henrique</div>
            <div className="font-mono text-xs text-white/35">Administrador • Sessão Protegida por Token</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-jarvis-border px-3.5 py-1.5 text-xs text-white/60 transition-colors hover:border-jarvis-red/50 hover:text-jarvis-red"
          >
            <LogOut size={13} /> sair
          </button>
        </div>
      </GlassPanel>

      <GlassPanel title="Instâncias conectadas">
        <ul className="space-y-2 text-xs">
          <li className="flex items-center justify-between">
            <span className="text-white/60">n8n</span>
            <a
              href="https://automacao-target-n8n.vr4mar.easypanel.host"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-jarvis-cyan hover:underline"
            >
              abrir <ExternalLink size={11} />
            </a>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-white/60">WAHA (WhatsApp)</span>
            <a
              href="https://automacao-target-waha.vr4mar.easypanel.host"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-jarvis-cyan hover:underline"
            >
              abrir <ExternalLink size={11} />
            </a>
          </li>
        </ul>
      </GlassPanel>

      <GlassPanel title="Visão & Gestos">
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80">Câmera</div>
              <div className="text-white/35">
                {cameraError ?? (cameraActive ? "Ativa — rastreando suas mãos" : "Desligada por padrão")}
              </div>
            </div>
            <button
              type="button"
              disabled={privacyMode}
              onClick={() => setCameraRequested(!cameraRequested)}
              className={`rounded-full border px-3.5 py-1.5 transition-colors disabled:opacity-40 ${
                cameraActive
                  ? "border-jarvis-green/40 bg-jarvis-green/10 text-jarvis-green"
                  : "border-jarvis-border text-white/60 hover:border-jarvis-cyan/40 hover:text-white/80"
              }`}
            >
              {cameraActive ? "Desativar" : "Ativar"}
            </button>
          </div>

          {cameraActive && (
            <div className="flex items-center justify-between font-mono text-[10px] text-white/30">
              <span>{trackingFps.toFixed(0)} fps</span>
              <span>{detectionLatencyMs.toFixed(1)} ms latência</span>
              <span className={renderQuality === "low" ? "text-jarvis-amber" : ""}>
                render {renderQuality === "low" ? "baixa" : "alta"}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80">Privacy Mode</div>
              <div className="text-white/35">Desliga câmera, gestos e microfone de uma vez, em qualquer página</div>
            </div>
            <button
              type="button"
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`rounded-full border px-3.5 py-1.5 transition-colors ${
                privacyMode
                  ? "border-jarvis-amber/50 bg-jarvis-amber/10 text-jarvis-amber"
                  : "border-jarvis-border text-white/60 hover:border-jarvis-cyan/40 hover:text-white/80"
              }`}
            >
              {privacyMode ? "Ligado" : "Desligado"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80">Debug Mode</div>
              <div className="text-white/35">Mostra o esqueleto da mão e leituras em tempo real</div>
            </div>
            <button
              type="button"
              onClick={() => setDebugMode(!debugMode)}
              className={`rounded-full border px-3.5 py-1.5 transition-colors ${
                debugMode
                  ? "border-jarvis-cyan/40 bg-jarvis-cyan/10 text-jarvis-cyanBright"
                  : "border-jarvis-border text-white/60 hover:border-jarvis-cyan/40 hover:text-white/80"
              }`}
            >
              {debugMode ? "Ligado" : "Desligado"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80">Modo Cinematic</div>
              <div className="text-white/35">Órbita lenta e automática da câmera quando ninguém interage</div>
            </div>
            <button
              type="button"
              onClick={() => setCinematicMode(!cinematicMode)}
              className={`rounded-full border px-3.5 py-1.5 transition-colors ${
                cinematicMode
                  ? "border-jarvis-cyan/40 bg-jarvis-cyan/10 text-jarvis-cyanBright"
                  : "border-jarvis-border text-white/60 hover:border-jarvis-cyan/40 hover:text-white/80"
              }`}
            >
              {cinematicMode ? "Ligado" : "Desligado"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80">Atalhos de gestos padrão</div>
              <div className="text-white/35">
                ✊ interrompe a fala · 🤙 liga/desliga o Cinematic · 4 dedos liga/desliga o
                Ponteiro — sem precisar gravar nada. Chat e painel de debug já têm seus
                próprios gestos únicos (toque no orbe e bater palma) e não duplicam aqui.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBuiltInGestureShortcutsEnabled(!builtInGestureShortcutsEnabled)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 transition-colors ${
                builtInGestureShortcutsEnabled
                  ? "border-jarvis-cyan/40 bg-jarvis-cyan/10 text-jarvis-cyanBright"
                  : "border-jarvis-border text-white/60 hover:border-jarvis-cyan/40 hover:text-white/80"
              }`}
            >
              {builtInGestureShortcutsEnabled ? "Ligado" : "Desligado"}
            </button>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-white/80">Confidence Threshold</span>
              <span className="font-mono text-white/40">{confidenceThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-jarvis-cyan"
            />
            <div className="mt-1 text-white/35">Gestos abaixo desse valor são ignorados</div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-white/80">Sensibilidade do Pinch</span>
              <span className="font-mono text-white/40">{pinchSensitivity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={pinchSensitivity}
              onChange={(e) => setPinchSensitivity(parseFloat(e.target.value))}
              className="w-full accent-jarvis-cyan"
            />
            <div className="mt-1 text-white/35">
              Aumente se juntar polegar e indicador não estiver virando pinch (veja o número no
              Debug Mode)
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-white/80">Mão dominante</div>
            <div className="flex gap-2">
              {(["right", "left"] as HandSide[]).map((hand) => (
                <button
                  key={hand}
                  type="button"
                  onClick={() => setDominantHand(hand)}
                  className={`rounded-full border px-3.5 py-1.5 transition-colors ${
                    dominantHand === hand
                      ? "border-jarvis-cyan/40 bg-jarvis-cyan/10 text-jarvis-cyanBright"
                      : "border-jarvis-border text-white/60 hover:border-jarvis-cyan/40 hover:text-white/80"
                  }`}
                >
                  {hand === "right" ? "Direita" : "Esquerda"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-jarvis-border/60 pt-4">
            <div>
              <div className="text-white/80">Modo Ponteiro</div>
              <div className="text-white/35">
                O dedo indicador da mão dominante vira um cursor de verdade na tela
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPointerModeEnabled(!pointerModeEnabled)}
              className={`rounded-full border px-3.5 py-1.5 transition-colors ${
                pointerModeEnabled
                  ? "border-jarvis-cyan/40 bg-jarvis-cyan/10 text-jarvis-cyanBright"
                  : "border-jarvis-border text-white/60 hover:border-jarvis-cyan/40 hover:text-white/80"
              }`}
            >
              {pointerModeEnabled ? "Ligado" : "Desligado"}
            </button>
          </div>

          <CalibrationFlow />

          <div className="border-t border-jarvis-border/60 pt-4">
            <CustomGestureRecorder />
          </div>

          <div className="border-t border-jarvis-border/60 pt-3 text-white/30">
            Todo o processamento roda no seu navegador — nenhum frame de vídeo é enviado ao
            backend ou ao n8n.
          </div>
        </div>
      </GlassPanel>

      <GlassPanel title="Sobre">
        <div className="space-y-1 text-xs text-white/40">
          <div>AURORA — G-TECH AI OS v3</div>
          <div>Tema: escuro (padrão único, sem alternância — ver .claude/context/design-system.md)</div>
        </div>
      </GlassPanel>
    </div>
  );
}
