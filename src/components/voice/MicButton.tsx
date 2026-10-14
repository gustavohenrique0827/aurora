import { motion } from "framer-motion";
import { useJarvisStore } from "../../state/store";

interface MicButtonProps {
  onStart: () => void;
  onStop: () => void;
}

export function MicButton({ onStart, onStop }: MicButtonProps) {
  const isListening = useJarvisStore((s) => s.isListening);

  return (
    <motion.button
      type="button"
      onClick={() => (isListening ? onStop() : onStart())}
      whileTap={{ scale: 0.92 }}
      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
        isListening
          ? "border-jarvis-cyanBright bg-jarvis-cyan/20 shadow-glow"
          : "border-jarvis-border bg-jarvis-panel hover:border-jarvis-cyan/60"
      }`}
      aria-label={isListening ? "Parar de ouvir" : "Falar com a Aurora"}
      title={isListening ? "Parar de ouvir" : "Falar com a Aurora"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <path d="M12 19v3" />
      </svg>
    </motion.button>
  );
}
