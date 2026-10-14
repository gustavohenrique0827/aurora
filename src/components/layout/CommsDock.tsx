import { motion, AnimatePresence } from "framer-motion";
import { PanelRightClose, PanelRightOpen, Mic } from "lucide-react";
import { useJarvisStore } from "../../state/store";
import { ChatPanel, type ChatPanelVoiceProps } from "../chat/ChatPanel";
import { DIRECTORS } from "@jarvis/shared";

/**
 * "O chat nunca desaparece. Fica fixo." — mounted once here in AppShell so it survives
 * route changes; DirectorPanel (and future module pages) only set which director it's
 * scoped to (store.activeDirectorId), never mount their own ChatPanel instance.
 *
 * NOTE: this component itself DOES unmount ChatPanel (below, when `open` is false —
 * that's the collapsed rail) and remounts it on every activeDirectorId change (the
 * AnimatePresence key). Voice (wake-word, push-to-talk, speak) must NOT live inside
 * ChatPanel because of that — it's owned by useGlobalVoiceAgent in AppShell instead
 * and passed down here, so it survives both of those remounts.
 */
export function CommsDock({ voice }: { voice: ChatPanelVoiceProps }) {
  const open = useJarvisStore((s) => s.commsDockOpen);
  const toggle = useJarvisStore((s) => s.toggleCommsDock);
  const isListening = useJarvisStore((s) => s.isListening);
  const activeDirectorId = useJarvisStore((s) => s.activeDirectorId);
  const scopedDirector = DIRECTORS.find((d) => d.id === activeDirectorId);

  if (!open) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-4 border-l border-jarvis-border py-4">
        <button
          type="button"
          onClick={toggle}
          className="text-white/40 transition-colors hover:text-white/80"
          title="Abrir conversa"
        >
          <PanelRightOpen size={17} />
        </button>
        <div className="relative">
          <Mic size={15} className={isListening ? "text-jarvis-cyanBright" : "text-white/25"} />
          {isListening && <span className="absolute inset-0 -m-1.5 animate-breathe rounded-full bg-jarvis-cyan/20" />}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Below lg the dock overlays the page instead of squeezing SideNav + main into
          whatever's left — this backdrop gives it a way to dismiss by tapping outside. */}
      <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={toggle} aria-hidden="true" />
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 384, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-y-0 right-0 z-40 flex max-w-full shrink-0 flex-col overflow-hidden border-l border-jarvis-border bg-jarvis-bg lg:static lg:z-auto lg:bg-jarvis-bg/40"
      >
        <div className="flex items-center justify-between border-b border-jarvis-border px-4 py-2.5">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/40">
              {scopedDirector ? `Comunicação · ${scopedDirector.name}` : "Comunicação"}
            </div>
          </div>
          <button type="button" onClick={toggle} className="shrink-0 text-white/40 transition-colors hover:text-white/80">
            <PanelRightClose size={16} />
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDirectorId ?? "core"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ChatPanel {...voice} />
          </motion.div>
        </AnimatePresence>
      </motion.aside>
    </>
  );
}
