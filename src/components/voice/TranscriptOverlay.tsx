import { AnimatePresence, motion } from "framer-motion";
import { useJarvisStore } from "../../state/store";

export function TranscriptOverlay() {
  const isListening = useJarvisStore((s) => s.isListening);
  const interimTranscript = useJarvisStore((s) => s.interimTranscript);
  const sphereMode = useJarvisStore((s) => s.sphereMode);

  const getStatusLabel = () => {
    if (isListening) return interimTranscript || "OUVINDO...";
    switch (sphereMode) {
      case "thinking":
        return "PROCESSANDO...";
      case "analyzing":
        return "ANALISANDO DADOS ESPACIAIS...";
      case "executing":
        return "EXECUTANDO COMANDO...";
      case "speaking":
        return "AURORA";
      case "warning":
        return "ATENÇÃO";
      case "success":
        return "CONCLUÍDO";
      default:
        return null;
    }
  };

  const label = getStatusLabel();

  return (
    <AnimatePresence>
      {label && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="pointer-events-none absolute bottom-20 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 px-4 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-jarvis-accent/40 bg-black/80 px-4 py-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(255,122,26,0.1)]">
            <span
              className={`h-2 w-2 rounded-full ${
                sphereMode === "analyzing"
                  ? "bg-purple-400 animate-ping"
                  : sphereMode === "executing"
                    ? "bg-jarvis-green animate-pulse"
                    : sphereMode === "warning"
                      ? "bg-jarvis-amber animate-bounce"
                      : "bg-jarvis-accentBright animate-pulse"
              }`}
            />
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              {label}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
